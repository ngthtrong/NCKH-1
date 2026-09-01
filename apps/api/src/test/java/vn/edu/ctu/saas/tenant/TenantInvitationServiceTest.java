package vn.edu.ctu.saas.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantInvitationEntity;
import vn.edu.ctu.saas.control.TenantInvitationRepository;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.security.TokenHasher;

class TenantInvitationServiceTest {
    private static final UUID TENANT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID INVITATION_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID OWNER_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID USER_ID = UUID.fromString("30000000-0000-0000-0000-000000000002");
    private static final String TOKEN = "1234567890123456789012345678901234567890123";

    private TenantInvitationRepository invitations;
    private TenantMembershipRepository memberships;
    private TenantRepository tenants;
    private UserAccountRepository users;
    private TokenHasher tokenHasher;
    private TenantInvitationService service;

    @BeforeEach
    void setUp() {
        invitations = mock(TenantInvitationRepository.class);
        memberships = mock(TenantMembershipRepository.class);
        tenants = mock(TenantRepository.class);
        users = mock(UserAccountRepository.class);
        tokenHasher = new TokenHasher();
        service = new TenantInvitationService(invitations, memberships, tenants, users, tokenHasher);
    }

    @Test
    void administratorCreatesOpaquePendingInvitationForUnregisteredEmail() {
        TenantEntity tenant = tenant();
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(users.findByEmailIgnoreCase("new@example.test")).thenReturn(Optional.empty());
        when(invitations.findTopByTenantIdAndEmailAndStatusOrderByCreatedAtDesc(
                TENANT_ID, "new@example.test", TenantInvitationStatus.PENDING)).thenReturn(Optional.empty());
        when(invitations.saveAndFlush(any())).thenAnswer(invocation -> {
            TenantInvitationEntity saved = invocation.getArgument(0);
            saved.setId(INVITATION_ID);
            return saved;
        });

        TenantInvitationService.InvitationCreatedView created = service.create(
                context(TenantRole.ADMIN), " NEW@Example.Test ", TenantRole.MEMBER);

        assertThat(created.token()).hasSizeGreaterThanOrEqualTo(32);
        assertThat(created.acceptancePath()).isEqualTo("/invitations/" + created.token());
        assertThat(created.invitation().email()).isEqualTo("new@example.test");
        assertThat(created.invitation().status()).isEqualTo(TenantInvitationStatus.PENDING);
        ArgumentCaptor<TenantInvitationEntity> saved = ArgumentCaptor.forClass(TenantInvitationEntity.class);
        verify(invitations).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isEqualTo(tokenHasher.sha256(created.token()));
        assertThat(saved.getValue().getTokenHash()).doesNotContain(created.token());
    }

    @Test
    void duplicateLivePendingInvitationIsRejectedWithoutReplacingToken() {
        TenantInvitationEntity prior = invitation(TenantInvitationStatus.PENDING, Instant.now().plusSeconds(60));
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant()));
        when(users.findByEmailIgnoreCase("person@example.test")).thenReturn(Optional.empty());
        when(invitations.findTopByTenantIdAndEmailAndStatusOrderByCreatedAtDesc(
                TENANT_ID, "person@example.test", TenantInvitationStatus.PENDING)).thenReturn(Optional.of(prior));

        assertThatThrownBy(() -> service.create(
                context(TenantRole.OWNER), "person@example.test", TenantRole.ADMIN))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("pending invitation");

        verify(invitations, never()).saveAndFlush(any());
    }

    @Test
    void matchingUserAcceptsInvitationAndCreatesMembership() {
        TenantInvitationEntity invitation = invitation(TenantInvitationStatus.PENDING, Instant.now().plusSeconds(60));
        when(invitations.lockByTokenHash(tokenHasher.sha256(TOKEN))).thenReturn(Optional.of(invitation));
        when(users.findById(USER_ID)).thenReturn(Optional.of(user("person@example.test")));
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant()));
        when(memberships.findByTenantIdAndUserId(TENANT_ID, USER_ID)).thenReturn(Optional.empty());

        TenantInvitationService.InvitationView accepted = service.accept(TOKEN, USER_ID);

        assertThat(accepted.status()).isEqualTo(TenantInvitationStatus.ACCEPTED);
        assertThat(invitation.getAcceptedByUserId()).isEqualTo(USER_ID);
        ArgumentCaptor<TenantMembershipEntity> membership = ArgumentCaptor.forClass(TenantMembershipEntity.class);
        verify(memberships).save(membership.capture());
        assertThat(membership.getValue().getTenantId()).isEqualTo(TENANT_ID);
        assertThat(membership.getValue().getUserId()).isEqualTo(USER_ID);
        assertThat(membership.getValue().getRole()).isEqualTo(TenantRole.MEMBER);
        assertThat(membership.getValue().isActive()).isTrue();
    }

    @Test
    void acceptedInvitationIsIdempotentForSameAccount() {
        TenantInvitationEntity invitation = invitation(TenantInvitationStatus.ACCEPTED, Instant.now().plusSeconds(60));
        invitation.setAcceptedByUserId(USER_ID);
        when(invitations.lockByTokenHash(tokenHasher.sha256(TOKEN))).thenReturn(Optional.of(invitation));
        when(users.findById(USER_ID)).thenReturn(Optional.of(user("person@example.test")));
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant()));

        assertThat(service.accept(TOKEN, USER_ID).status()).isEqualTo(TenantInvitationStatus.ACCEPTED);

        verifyNoInteractions(memberships);
    }

    @Test
    void accountWithDifferentEmailCannotAcceptInvitation() {
        TenantInvitationEntity invitation = invitation(TenantInvitationStatus.PENDING, Instant.now().plusSeconds(60));
        when(invitations.lockByTokenHash(tokenHasher.sha256(TOKEN))).thenReturn(Optional.of(invitation));
        when(users.findById(USER_ID)).thenReturn(Optional.of(user("other@example.test")));

        assertThatThrownBy(() -> service.accept(TOKEN, USER_ID))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessageContaining("another email");

        verifyNoInteractions(memberships, tenants);
    }

    @Test
    void rejectionIsIdempotentForMatchingAccount() {
        TenantInvitationEntity invitation = invitation(TenantInvitationStatus.PENDING, Instant.now().plusSeconds(60));
        when(invitations.lockByTokenHash(tokenHasher.sha256(TOKEN))).thenReturn(Optional.of(invitation));
        when(users.findById(USER_ID)).thenReturn(Optional.of(user("person@example.test")));
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant()));

        assertThat(service.reject(TOKEN, USER_ID).status()).isEqualTo(TenantInvitationStatus.REJECTED);
        assertThat(service.reject(TOKEN, USER_ID).status()).isEqualTo(TenantInvitationStatus.REJECTED);

        verify(invitations).save(invitation);
        verifyNoInteractions(memberships);
    }

    @Test
    void expiredInvitationCannotBeAccepted() {
        TenantInvitationEntity invitation = invitation(TenantInvitationStatus.PENDING, Instant.now().minusSeconds(1));
        when(invitations.lockByTokenHash(tokenHasher.sha256(TOKEN))).thenReturn(Optional.of(invitation));
        when(users.findById(USER_ID)).thenReturn(Optional.of(user("person@example.test")));
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant()));

        assertThatThrownBy(() -> service.accept(TOKEN, USER_ID))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("no longer");

        assertThat(invitation.getStatus()).isEqualTo(TenantInvitationStatus.EXPIRED);
        verify(invitations).save(invitation);
        verifyNoInteractions(memberships);
    }

    private TenantContext context(TenantRole role) {
        return new TenantContext(
                OWNER_ID, TENANT_ID, "alpha", "STARTER", TenantPlacement.POOL,
                Set.of(role), "request-test", "correlation-test");
    }

    private TenantEntity tenant() {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(TENANT_ID);
        tenant.setSlug("alpha");
        tenant.setName("Alpha workspace");
        tenant.setTier("STARTER");
        tenant.setStatus(TenantStatus.ACTIVE);
        return tenant;
    }

    private TenantInvitationEntity invitation(TenantInvitationStatus status, Instant expiresAt) {
        TenantInvitationEntity invitation = new TenantInvitationEntity();
        invitation.setId(INVITATION_ID);
        invitation.setTenantId(TENANT_ID);
        invitation.setEmail("person@example.test");
        invitation.setRole(TenantRole.MEMBER);
        invitation.setTokenHash(tokenHasher.sha256(TOKEN));
        invitation.setStatus(status);
        invitation.setInvitedBy(OWNER_ID);
        invitation.setExpiresAt(expiresAt);
        return invitation;
    }

    private UserAccountEntity user(String email) {
        UserAccountEntity user = new UserAccountEntity();
        user.setId(USER_ID);
        user.setEmail(email);
        user.setDisplayName("Invited User");
        user.setPasswordHash("not-used");
        user.setEnabled(true);
        return user;
    }
}
