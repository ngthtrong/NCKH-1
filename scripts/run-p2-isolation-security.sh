#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
maven_user_home="${MAVEN_USER_HOME:-/tmp/nckh-maven-home}"
maven_repository="${MAVEN_REPOSITORY_LOCAL:-/tmp/nckh-m2}"

MAVEN_USER_HOME="$maven_user_home" \
  "$repository_root/apps/api/mvnw" \
  -q \
  -f "$repository_root/experiments/spikes/isolation-harness/pom.xml" \
  -Dmaven.repo.local="$maven_repository" \
  clean test
