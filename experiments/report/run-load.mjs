#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if(existsSync('infra/.env')) process.loadEnvFile('infra/.env');
const variant=process.argv[2] || 'after';
if(!['before','after'].includes(variant)) throw new Error('Usage: node experiments/report/run-load.mjs before|after');
const runClass=process.env.RUN_CLASS || 'development';
const runId=`kb3-${variant}-${new Date().toISOString().replaceAll(':','-')}`;
const output=resolve(`experiments/results/${runClass}/${runId}`);
await mkdir(output,{recursive:true});
const env={...process.env,RUN_ID:runId,RATE_LIMIT_VARIANT:variant,BASE_URL:'http://caddy',
  TENANT_A_SLUG:'pool-demo',TENANT_B_SLUG:'t-acme',TENANT_C_SLUG:'t-lotus',
  NOISY_DURATION:process.env.NOISY_DURATION || '30s'};
const manifest=resolve(output,'manifest.json');
execFileSync('python3',['experiments/analysis/capture_manifest.py','start','--output',manifest,
  '--run-id',runId,'--run-class',runClass,'--scenario','noisy-neighbor','--variant',variant,
  '--script','experiments/report/kb3-load.js','--summary-file','summary.json','--raw-file','raw-metrics.json',
  '--resource-file','resource-metrics.json'],{env,stdio:'inherit'});
const recorded=JSON.parse(await readFile(manifest,'utf8'));
recorded.tools.k6=execFileSync('docker',['run','--rm','grafana/k6:0.57.0','version'],{encoding:'utf8'}).trim();
recorded.notes+=' Report workload and actual container image/resource limits are in workload.json and environment.json.';
await writeFile(manifest,JSON.stringify(recorded,null,2));
const containers=execFileSync('docker',['inspect','--format',
  '{{.Name}} {{.Config.Image}} {{.Image}} memory_bytes={{.HostConfig.Memory}} nano_cpus={{.HostConfig.NanoCpus}}',
  'nckh-report-api-1','nckh-report-web-1','nckh-report-postgres-1','nckh-report-redis-1'],{encoding:'utf8'});
await writeFile(resolve(output,'environment.json'),JSON.stringify({capturedAt:new Date().toISOString(),containers},null,2));
const args=['run','--rm','--network','nckh-report_saas','--user',`${process.getuid()}:${process.getgid()}`,
  '-v',`${resolve('experiments/report')}:/scripts:ro`,'-v',`${output}:/results`,
  ...['BASE_URL','DEMO_OWNER_EMAIL','DEMO_OWNER_PASSWORD','RATE_LIMIT_VARIANT','NOISY_DURATION','AGGRESSOR_RATE','SMALL_TASKS','LARGE_TASKS','SLO_P95_MS','RUN_CLASS'].flatMap(name=>['-e',name]),
  'grafana/k6:0.57.0','run','--summary-export','/results/summary.json','--out','json=/results/raw-metrics.json','/scripts/kb3-load.js'];
const child=spawn('docker',args,{env,stdio:'inherit'});
const code=await new Promise((done)=>{child.on('exit',done);child.on('error',()=>done(1));});
execFileSync('python3',['experiments/analysis/capture_manifest.py','finish','--output',manifest,'--status',code===0?'succeeded':'failed'],{env,stdio:'inherit'});
try {
  execFileSync('python3',['experiments/analysis/export_prometheus.py','--manifest',manifest,'--output',resolve(output,'resource-metrics.json')],{env,stdio:'inherit'});
} catch { console.error('Resource metrics are incomplete; this run cannot support CPU/RAM conclusions.'); }
await writeFile(resolve(output,'workload.json'),JSON.stringify({variant,smallTasks:env.SMALL_TASKS||5,largeTasks:env.LARGE_TASKS||30,
  duration:env.NOISY_DURATION,aggressorRate:env.AGGRESSOR_RATE||30,mutationWorkload:'one writer per victim, one drag every five seconds'},null,2));
console.log(`Measured evidence: ${output}`);
process.exitCode=typeof code==='number'?code:1;
