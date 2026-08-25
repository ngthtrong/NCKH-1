FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY apps/api/pom.xml ./
RUN mvn -B -ntp -DskipTests dependency:go-offline

COPY apps/api/src src
RUN mvn -B -ntp -DskipTests package \
    && find target -maxdepth 1 -type f -name '*.jar' ! -name '*-sources.jar' ! -name '*.original' -exec cp '{}' /workspace/application.jar \; \
    && test -s /workspace/application.jar

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S -G app -u 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/application.jar /app/application.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/urandom", "-jar", "/app/application.jar"]
