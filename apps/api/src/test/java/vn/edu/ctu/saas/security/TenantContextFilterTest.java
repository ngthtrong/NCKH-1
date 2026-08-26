package vn.edu.ctu.saas.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

class TenantContextFilterTest {
    private final UUID userId = UUID.randomUUID();
    private final UUID tenantId = UUID.randomUUID();
    private TenantRepository tenants;
    private TenantMembershipRepository memberships;
    private TenantPlacementRepository placements;
    private TenantContextFilter filter;

    @BeforeEach
    void setUp() {
        tenants = mock(TenantRepository.class);
        memberships = mock(TenantMembershipRepository.class);
        placements = mock(TenantPlacementRepository.class);
        filter = new TenantContextFilter(
                tenants, memberships, placements,
                new TenantHostResolver(TestAppProperties.create()), JsonMapper.builder().build());
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
        TenantContextHolder.clear();
    }

    @Test
    void rejectsTenantATokenOnTenantBHostBeforeCallingApplication() throws Exception {
        authenticate(jwt("alpha", 1));
        MockHttpServletRequest request = request("beta.localhost");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean applicationCalled = new AtomicBoolean();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> applicationCalled.set(true));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Token tenant does not match request host");
        assertThat(applicationCalled).isFalse();
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void rejectsOldTokenAfterMembershipSecurityVersionChanges() throws Exception {
        stubActiveTenant(2);
        authenticate(jwt("alpha", 1));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("alpha.localhost"), response, (ignoredRequest, ignoredResponse) -> {});

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("membership changed");
    }

    @Test
    void rejectsOldTokenAfterMembershipIsRevokedWithoutCallingApplication() throws Exception {
        stubTenant(TenantStatus.ACTIVE, false, 2);
        authenticate(jwt("alpha", 1));
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean applicationCalled = new AtomicBoolean();

        filter.doFilter(request("alpha.localhost"), response,
                (ignoredRequest, ignoredResponse) -> applicationCalled.set(true));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("membership is no longer active");
        assertThat(applicationCalled).isFalse();
        verify(placements, never()).findByTenantId(tenantId);
    }

    @Test
    void rejectsSuspendedTenantBeforeLookingUpMembership() throws Exception {
        stubTenant(TenantStatus.SUSPENDED, true, 1);
        authenticate(jwt("alpha", 1));
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean applicationCalled = new AtomicBoolean();

        filter.doFilter(request("alpha.localhost"), response,
                (ignoredRequest, ignoredResponse) -> applicationCalled.set(true));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Tenant is not active for this host");
        assertThat(applicationCalled).isFalse();
        verify(memberships, never()).findByTenantIdAndUserId(tenantId, userId);
    }

    @Test
    void rejectsTamperedSlugClaimEvenWhenItMatchesTheRequestHost() throws Exception {
        stubActiveTenant(1);
        authenticate(jwt("beta", 1));
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean applicationCalled = new AtomicBoolean();

        filter.doFilter(request("beta.localhost"), response,
                (ignoredRequest, ignoredResponse) -> applicationCalled.set(true));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Tenant is not active for this host");
        assertThat(applicationCalled).isFalse();
        verify(memberships, never()).findByTenantIdAndUserId(tenantId, userId);
    }

    @Test
    void establishesContextForValidRequestAndAlwaysClearsThreadLocal() throws Exception {
        stubActiveTenant(3);
        authenticate(jwt("alpha", 3));
        AtomicBoolean sawExpectedContext = new AtomicBoolean();

        filter.doFilter(request("alpha.localhost"), new MockHttpServletResponse(), (ignoredRequest, ignoredResponse) -> {
            sawExpectedContext.set(
                    TenantContextHolder.getRequired().tenantId().equals(tenantId)
                            && TenantContextHolder.getRequired().placement() == TenantPlacement.POOL);
        });

        assertThat(sawExpectedContext).isTrue();
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    private void stubActiveTenant(long membershipVersion) {
        stubTenant(TenantStatus.ACTIVE, true, membershipVersion);
    }

    private void stubTenant(TenantStatus status, boolean membershipActive, long membershipVersion) {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(tenantId);
        tenant.setSlug("alpha");
        tenant.setTier("STARTER");
        tenant.setStatus(status);
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(tenantId);
        membership.setUserId(userId);
        membership.setRole(TenantRole.MEMBER);
        membership.setActive(membershipActive);
        membership.setSecurityVersion(membershipVersion);
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenantId);
        placement.setPlacementType(TenantPlacement.POOL);
        when(tenants.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(memberships.findByTenantIdAndUserId(tenantId, userId)).thenReturn(Optional.of(membership));
        when(placements.findByTenantId(tenantId)).thenReturn(Optional.of(placement));
    }

    private Jwt jwt(String slug, long membershipVersion) {
        return Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("kind", "tenant")
                .claim("tid", tenantId.toString())
                .claim("tenant_slug", slug)
                .claim("membership_version", membershipVersion)
                .issuedAt(Instant.now().minusSeconds(1))
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
    }

    private void authenticate(Jwt jwt) {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    private MockHttpServletRequest request(String host) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName(host);
        request.setRequestURI("/api/v1/projects");
        return request;
    }
}
