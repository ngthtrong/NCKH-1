package vn.tenantflow.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.entity.TenantUser;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.domain.repository.TenantUserRepository;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TenantUserService {

    private final TenantUserRepository tenantUserRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    public TenantUserService(TenantUserRepository tenantUserRepository,
                             TenantRepository tenantRepository,
                             PasswordEncoder passwordEncoder) {
        this.tenantUserRepository = tenantUserRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Map<String, Object>> listMembers() {
        TenantInfo info = TenantContext.get();
        return tenantUserRepository.findByTenantIdOrderByCreatedAtAsc(info.tenantId()).stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "email", u.getEmail(),
                        "fullName", u.getFullName(),
                        "role", u.getRole(),
                        "createdAt", u.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public Map<String, Object> addMember(String email, String fullName, String password, String role) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền thêm thành viên");
        }

        Tenant tenant = tenantRepository.findById(info.tenantId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Không tìm thấy tổ chức"));

        List<TenantUser> currentMembers = tenantUserRepository.findByTenantIdOrderByCreatedAtAsc(info.tenantId());
        if (currentMembers.size() >= tenant.getMaxMembers()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "MAX_MEMBERS_REACHED",
                    "Tổ chức đã đạt giới hạn tối đa " + tenant.getMaxMembers() + " thành viên của gói " + tenant.getTier());
        }

        String normalizedEmail = email.trim().toLowerCase();
        String normalizedRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "MEMBER";
        if (!"TENANT_ADMIN".equals(normalizedRole) && !"MEMBER".equals(normalizedRole)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Vai trò phải là TENANT_ADMIN hoặc MEMBER");
        }

        if (tenantUserRepository.existsByTenantIdAndEmailIgnoreCase(info.tenantId(), normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBER_EXISTS", "Email đã tồn tại trong tổ chức này");
        }

        TenantUser user = new TenantUser();
        user.setTenantId(info.tenantId());
        user.setEmail(normalizedEmail);
        user.setFullName(fullName.trim());
        user.setPasswordHash(passwordEncoder.encode((password != null && !password.isBlank()) ? password : "Password123!"));
        user.setRole(normalizedRole);
        user = tenantUserRepository.save(user);

        return Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "role", user.getRole(),
                "createdAt", user.getCreatedAt()
        );
    }

    @Transactional
    public Map<String, Object> updateRole(UUID userId, String role) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền phân quyền");
        }
        String normalizedRole = role.trim().toUpperCase();
        if (!"TENANT_ADMIN".equals(normalizedRole) && !"MEMBER".equals(normalizedRole)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Vai trò phải là TENANT_ADMIN hoặc MEMBER");
        }

        TenantUser user = tenantUserRepository.findById(userId)
                .filter(u -> u.getTenantId().equals(info.tenantId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "Không tìm thấy thành viên"));

        user.setRole(normalizedRole);
        user = tenantUserRepository.save(user);
        return Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "role", user.getRole(),
                "createdAt", user.getCreatedAt()
        );
    }

    @Transactional
    public void removeMember(UUID userId) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền xóa thành viên");
        }
        if (userId.equals(info.userId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_REMOVE_SELF", "Không thể tự xóa chính mình");
        }
        TenantUser user = tenantUserRepository.findById(userId)
                .filter(u -> u.getTenantId().equals(info.tenantId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "Không tìm thấy thành viên"));
        tenantUserRepository.delete(user);
    }
}
