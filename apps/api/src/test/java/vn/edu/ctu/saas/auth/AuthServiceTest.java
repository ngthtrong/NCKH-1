package vn.edu.ctu.saas.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.RefreshSessionRepository;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.TenantSessionGrantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.security.JwtTokenService;
import vn.edu.ctu.saas.security.TokenHasher;
import vn.edu.ctu.saas.support.TestAppProperties;

class AuthServiceTest {
    private UserAccountRepository users;
    private PasswordEncoder passwordEncoder;
    private JwtTokenService tokens;
    private AuthService service;

    @BeforeEach
    void setUp() {
        users = mock(UserAccountRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokens = mock(JwtTokenService.class);
        service = new AuthService(
                users,
                mock(TenantRepository.class),
                mock(TenantMembershipRepository.class),
                mock(TenantPlacementRepository.class),
                mock(TenantSessionGrantRepository.class),
                mock(RefreshSessionRepository.class),
                passwordEncoder,
                tokens,
                new TokenHasher(),
                TestAppProperties.create());
    }

    @Test
    void registersNormalizedAccountAndReturnsGlobalSession() {
        UUID userId = UUID.randomUUID();
        when(users.findByEmailIgnoreCase("new.user@example.test")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("SafePassword123!")).thenReturn("bcrypt-hash");
        when(users.saveAndFlush(any(UserAccountEntity.class))).thenAnswer(invocation -> {
            UserAccountEntity user = invocation.getArgument(0);
            user.setId(userId);
            return user;
        });
        when(tokens.globalToken(any(UserAccountEntity.class))).thenReturn("global-access-token");

        AuthDtos.LoginResponse response = service.register(new AuthDtos.RegisterRequest(
                " New.User@Example.Test ", "  New User  ", "SafePassword123!"));

        assertThat(response.accessToken()).isEqualTo("global-access-token");
        assertThat(response.user().id()).isEqualTo(userId);
        assertThat(response.user().email()).isEqualTo("new.user@example.test");
        assertThat(response.user().displayName()).isEqualTo("New User");
        assertThat(response.tenants()).isEmpty();
        ArgumentCaptor<UserAccountEntity> saved = ArgumentCaptor.forClass(UserAccountEntity.class);
        verify(users).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("bcrypt-hash");
        assertThat(saved.getValue().isSystemAdmin()).isFalse();
    }

    @Test
    void rejectsDuplicateRegistrationBeforeHashingPassword() {
        UserAccountEntity existing = new UserAccountEntity();
        when(users.findByEmailIgnoreCase("known@example.test")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.register(new AuthDtos.RegisterRequest(
                "known@example.test", "Known User", "SafePassword123!")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");

        verify(passwordEncoder, never()).encode(any());
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void rejectsPasswordBeyondBcryptUtf8Limit() {
        String password = "mật".repeat(25);

        assertThatThrownBy(() -> service.register(new AuthDtos.RegisterRequest(
                "new@example.test", "New User", password)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("72 UTF-8 bytes");

        verify(users, never()).saveAndFlush(any());
    }
}
