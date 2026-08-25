package vn.edu.ctu.saas.notification;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.ctu.saas.notification.NotificationService.NotificationPreferences;
import vn.edu.ctu.saas.notification.NotificationService.NotificationView;
import vn.edu.ctu.saas.notification.NotificationService.PushSubscriptionRequest;
import vn.edu.ctu.saas.notification.NotificationService.PushSubscriptionView;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificationView> list() { return service.list(); }

    @PatchMapping("/{id}/read")
    public NotificationView markRead(@PathVariable UUID id) { return service.markRead(id); }

    @PostMapping("/read-all")
    public void markAllRead() { service.markAllRead(); }

    @GetMapping("/preferences")
    public NotificationPreferences preferences() { return service.preferences(); }

    @PutMapping("/preferences")
    public NotificationPreferences updatePreferences(@RequestBody NotificationPreferences request) {
        return service.updatePreferences(request);
    }

    @PostMapping("/push-subscriptions")
    public PushSubscriptionView addPushSubscription(@Valid @RequestBody ValidPushSubscription request) {
        return service.addPushSubscription(new PushSubscriptionRequest(request.endpoint(), request.p256dh(), request.auth()));
    }

    @DeleteMapping("/push-subscriptions/{id}")
    public void removePushSubscription(@PathVariable UUID id) { service.removePushSubscription(id); }

    public record ValidPushSubscription(
            @NotBlank String endpoint,
            @NotBlank String p256dh,
            @NotBlank String auth) {}
}
