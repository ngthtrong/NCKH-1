package vn.tenantflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.tenantflow.cache.TenantConfigCacheService;

@Configuration
public class RedisConfig {

    public static final String CONFIG_INVALIDATE_CHANNEL = "tenant:config:invalidate";

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }

    @Bean
    public ChannelTopic configInvalidateTopic() {
        return new ChannelTopic(CONFIG_INVALIDATE_CHANNEL);
    }

    @Bean
    public MessageListenerAdapter configInvalidateListener(TenantConfigCacheService cacheService) {
        return new MessageListenerAdapter(cacheService, "onConfigInvalidateMessage");
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory factory,
            MessageListenerAdapter configInvalidateListener,
            ChannelTopic configInvalidateTopic) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.addMessageListener(configInvalidateListener, configInvalidateTopic);
        return container;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
