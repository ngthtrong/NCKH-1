package vn.edu.ctu.saas.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;

class TenantManagementServiceSecurityTest {
    private static final UUID TENANT_A = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private static final UUID ACTOR = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID TARGET_USER = UUID.fromString("30000000-0000-0000-0000-000000000002");
    private static final UUID MEMBERSHIP_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final UUID OWNER_MEMBERSHIP_ID = UUID.fromString("40000000-0000-0000-0000-000000000002");

    private TenantMembershipRepository memberships;
    private UserAccountRepository users;
    private TenantManagementService service;

    @BeforeEach
    void setUp() {
        memberships = mock(TenantMembershipRepository.class);
        users = mock(UserAccountRepository.class);
        service = new TenantManagementService(
                mock(TenantRepository.class),
                mock(TenantPlacementRepository.class),
                memberships,
                users);
    }

    @Test
    void tenantMemberCannotProbeMembershipIdsThroughRevoke() {
        assertThatThrownBy(() -> service.revoke(context(TenantRole.MEMBER), MEMBERSHIP_ID))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessageContaining("administrator role");

        verifyNoInteractions(memberships);
    }

    @Test
    void administratorCannotCreateAnotherOwner() {
        TenantMembershipEntity target = membership(TENANT_A, TenantRole.MEMBER, true, 1);
        when(memberships.findById(MEMBERSHIP_ID)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.updateMember(
                context(TenantRole.ADMIN), MEMBERSHIP_ID, TenantRole.OWNER, true))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ownership workflow");

        assertThat(target.getRole()).isEqualTo(TenantRole.MEMBER);
        verify(memberships, never()).save(target);
    }

    @Test
    void administratorCannotRevokePeerAdministrator() {
        TenantMembershipEntity peer = membership(TENANT_A, TenantRole.ADMIN, true, 4);
        when(memberships.findById(MEMBERSHIP_ID)).thenReturn(Optional.of(peer));

        assertThatThrownBy(() -> service.revoke(context(TenantRole.ADMIN), MEMBERSHIP_ID))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessageContaining("tenant owner");

        assertThat(peer.isActive()).isTrue();
        assertThat(peer.getSecurityVersion()).isEqualTo(4);
        verify(memberships, never()).save(peer);
    }

    @Test
    void administratorCanPromoteMemberToAdministratorAndRotatesSecurityVersion() {
        TenantMembershipEntity target = membership(TENANT_A, TenantRole.MEMBER, true, 7);
        UserAccountEntity user = user(TARGET_USER);
        when(memberships.findById(MEMBERSHIP_ID)).thenReturn(Optional.of(target));
        when(users.findById(TARGET_USER)).thenReturn(Optional.of(user));

        TenantManagementService.MemberView result = service.updateMember(
                context(TenantRole.ADMIN), MEMBERSHIP_ID, TenantRole.ADMIN, true);

        assertThat(result.role()).isEqualTo(TenantRole.ADMIN);
        assertThat(result.securityVersion()).isEqualTo(8);
        assertThat(target.getRole()).isEqualTo(TenantRole.ADMIN);
        verify(memberships).save(target);
    }

    @Test
    void ownerCanRevokeMemberAndRotatesSecurityVersion() {
        TenantMembershipEntity target = membership(TENANT_A, TenantRole.MEMBER, true, 11);
        UserAccountEntity user = user(TARGET_USER);
        when(memberships.findById(MEMBERSHIP_ID)).thenReturn(Optional.of(target));
        when(users.findById(TARGET_USER)).thenReturn(Optional.of(user));

        service.revoke(context(TenantRole.OWNER), MEMBERSHIP_ID);

        assertThat(target.isActive()).isFalse();
        assertThat(target.getSecurityVersion()).isEqualTo(12);
        verify(memberships, times(2)).findById(MEMBERSHIP_ID);
        verify(memberships).save(target);
    }

    @Test
    void membershipIdFromAnotherTenantCannotBeMutated() {
        TenantMembershipEntity foreignMembership = membership(TENANT_B, TenantRole.MEMBER, true, 1);
        when(memberships.findById(MEMBERSHIP_ID)).thenReturn(Optional.of(foreignMembership));

        assertThatThrownBy(() -> service.updateMember(
                context(TenantRole.OWNER), MEMBERSHIP_ID, TenantRole.ADMIN, true))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Membership not found");

        verify(memberships, never()).save(foreignMembership);
        verifyNoInteractions(users);
    }

    @Test
    void ownerTransfersOwnershipAtomicallyAndRotatesBothSecurityVersions() {
        TenantMembershipEntity owner = membership(
                OWNER_MEMBERSHIP_ID, TENANT_A, ACTOR, TenantRole.OWNER, true, 4);
        TenantMembershipEntity target = membership(
                MEMBERSHIP_ID, TENANT_A, TARGET_USER, TenantRole.MEMBER, true, 7);
        UserAccountEntity user = user(TARGET_USER);
        when(memberships.lockActiveByTenantId(TENANT_A)).thenReturn(List.of(owner, target));
        when(users.findById(TARGET_USER)).thenReturn(Optional.of(user));

        TenantManagementService.MemberView result = service.transferOwnership(
                context(TenantRole.OWNER), MEMBERSHIP_ID);

        assertThat(result.role()).isEqualTo(TenantRole.OWNER);
        assertThat(owner.getRole()).isEqualTo(TenantRole.ADMIN);
        assertThat(owner.getSecurityVersion()).isEqualTo(5);
        assertThat(target.getRole()).isEqualTo(TenantRole.OWNER);
        assertThat(target.getSecurityVersion()).isEqualTo(8);
        verify(memberships).saveAll(List.of(owner, target));
    }

    @Test
    void administratorCannotTransferOwnership() {
        assertThatThrownBy(() -> service.transferOwnership(context(TenantRole.ADMIN), MEMBERSHIP_ID))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessageContaining("tenant owner");

        verifyNoInteractions(memberships, users);
    }

    @Test
    void ownerCannotProbeForeignOrInactiveTransferTarget() {
        TenantMembershipEntity owner = membership(
                OWNER_MEMBERSHIP_ID, TENANT_A, ACTOR, TenantRole.OWNER, true, 4);
        when(memberships.lockActiveByTenantId(TENANT_A)).thenReturn(List.of(owner));

        assertThatThrownBy(() -> service.transferOwnership(context(TenantRole.OWNER), MEMBERSHIP_ID))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Active target");

        verify(memberships, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verifyNoInteractions(users);
    }

    private TenantContext context(TenantRole role) {
        return new TenantContext(
                ACTOR, TENANT_A, "alpha", "STARTER", TenantPlacement.POOL,
                Set.of(role), "request-test", "correlation-test");
    }

    private TenantMembershipEntity membership(UUID tenantId, TenantRole role, boolean active, long version) {
        return membership(MEMBERSHIP_ID, tenantId, TARGET_USER, role, active, version);
    }

    private TenantMembershipEntity membership(
            UUID id,
            UUID tenantId,
            UUID userId,
            TenantRole role,
            boolean active,
            long version) {
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setId(id);
        membership.setTenantId(tenantId);
        membership.setUserId(userId);
        membership.setRole(role);
        membership.setActive(active);
        membership.setSecurityVersion(version);
        return membership;
    }

    private UserAccountEntity user(UUID id) {
        UserAccountEntity user = new UserAccountEntity();
        user.setId(id);
        user.setEmail("target@example.test");
        user.setDisplayName("Target User");
        user.setPasswordHash("not-used-in-this-test");
        return user;
    }
}
