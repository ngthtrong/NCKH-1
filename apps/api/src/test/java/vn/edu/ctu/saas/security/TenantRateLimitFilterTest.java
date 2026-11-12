package vn.edu.ctu.saas.security;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
class TenantRateLimitFilterTest {
 private TenantRateLimitFilter filter;private StringRedisTemplate redis;private final UUID id=UUID.randomUUID();
 @BeforeEach void setup(){
  var properties=TestAppProperties.create();filter=new TenantRateLimitFilter(properties);redis=mock(StringRedisTemplate.class);
  ObjectProvider<StringRedisTemplate> provider=mock(ObjectProvider.class);when(provider.getObject()).thenReturn(redis);
  ReflectionTestUtils.setField(filter,"redis",provider);ReflectionTestUtils.setField(filter,"distributed",true);
  ReflectionTestUtils.setField(filter,"hostResolver",new TenantHostResolver(properties));
  var jwt=Jwt.withTokenValue("verified-token").header("alg","HS256").subject(UUID.randomUUID().toString()).claim("kind","tenant").claim("tid",id.toString()).claim("tenant_slug","t-acme").claim("tier","STARTER").build();
  SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
 }
 @AfterEach void clear(){SecurityContextHolder.clearContext();TenantContextHolder.clear();}
 private MockHttpServletRequest request(String host){var r=new MockHttpServletRequest("GET","/api/v1/projects");r.setServerName(host);return r;}
 @Test void deniesBeforeTenantContextAndDownstreamSql()throws Exception{
  when(redis.execute(any(RedisScript.class),anyList(),any(),any())).thenReturn(-400L);
  var response=new MockHttpServletResponse();var called=new java.util.concurrent.atomic.AtomicBoolean();
  filter.doFilter(request("t-acme.localhost"),response,(r,s)->called.set(true));
  assertThat(response.getStatus()).isEqualTo(429);assertThat(called).isFalse();assertThat(TenantContextHolder.getNullable()).isNull();
  assertThat(response.getHeader("X-Tenant-ID")).isEqualTo(id.toString());assertThat(response.getHeader("Retry-After")).isEqualTo("1");
  verify(redis).execute(any(RedisScript.class),eq(java.util.List.of("tenant:"+id+":ratelimit:bucket")),eq("2.0"),eq("12"));
 }
 @Test void wrongHostCannotChargeAnotherTenant()throws Exception{
  var called=new java.util.concurrent.atomic.AtomicBoolean();filter.doFilter(request("t-lotus.localhost"),new MockHttpServletResponse(),(r,s)->called.set(true));
  assertThat(called).isTrue();verifyNoInteractions(redis);
 }
 @Test void redisOutageFailsClosed()throws Exception{
  when(redis.execute(any(RedisScript.class),anyList(),any(),any())).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("offline"));
  var response=new MockHttpServletResponse();var called=new java.util.concurrent.atomic.AtomicBoolean();
  filter.doFilter(request("t-acme.localhost"),response,(r,s)->called.set(true));assertThat(response.getStatus()).isEqualTo(503);assertThat(called).isFalse();
 }
}
