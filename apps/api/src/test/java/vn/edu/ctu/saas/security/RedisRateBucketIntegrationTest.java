package vn.edu.ctu.saas.security;
import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;
import org.testcontainers.containers.GenericContainer;
class RedisRateBucketIntegrationTest {
 @Test void atomicBurstRefillAndIndependentTenants()throws Exception{
  try(var server=new GenericContainer<>("redis:7-alpine").withExposedPorts(6379)){
   server.start();var factory=new LettuceConnectionFactory(server.getHost(),server.getMappedPort(6379));factory.afterPropertiesSet();factory.start();
   try{
    var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();
    RedisScript<Long> script=(RedisScript<Long>)ReflectionTestUtils.getField(TenantRateLimitFilter.class,"CONSUME");
    var pool=Executors.newFixedThreadPool(12);
    try{
     var jobs=new java.util.ArrayList<Callable<Long>>();for(int i=0;i<80;i++)jobs.add(()->redis.execute(script,List.of("tenant:a:ratelimit:bucket"),"0.001","12"));
     int accepted=0;for(var result:pool.invokeAll(jobs))if(result.get()>=0)accepted++;assertThat(accepted).isEqualTo(12);
     assertThat(redis.execute(script,List.of("tenant:b:ratelimit:bucket"),"0.001","12")).isEqualTo(11L);
     redis.opsForHash().put("tenant:a:ratelimit:bucket","time","0");assertThat(redis.execute(script,List.of("tenant:a:ratelimit:bucket"),"0.001","12")).isEqualTo(11L);
    }finally{pool.shutdownNow();}
   }finally{factory.destroy();}
  }
 }
}
