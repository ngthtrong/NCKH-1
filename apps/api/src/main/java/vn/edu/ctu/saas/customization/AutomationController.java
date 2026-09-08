package vn.edu.ctu.saas.customization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AutomationController {
    private final AutomationService service;

    public AutomationController(AutomationService service) {
        this.service = service;
    }

    @GetMapping("/projects/{projectId}/automation-rules")
    public List<AutomationService.RuleView> rules(@PathVariable UUID projectId) {
        return service.rules(projectId);
    }

    @PostMapping("/projects/{projectId}/automation-rules")
    public AutomationService.RuleView create(
            @PathVariable UUID projectId, @Valid @RequestBody CreateRuleRequest request) {
        return service.create(projectId, new AutomationService.CreateRule(
                request.name(), request.triggerType(), request.triggerBoardId(), request.triggerColumnId(),
                request.actionType(), request.actionUserIds()));
    }

    @PostMapping("/automation-rules/{ruleId}/disable")
    public AutomationService.RuleView disable(
            @PathVariable UUID ruleId, @Valid @RequestBody VersionRequest request) {
        return service.disable(ruleId, request.version());
    }

    @GetMapping("/projects/{projectId}/automation-executions")
    public List<AutomationService.ExecutionView> executions(@PathVariable UUID projectId) {
        return service.executions(projectId);
    }

    public record CreateRuleRequest(
            @NotBlank String name,
            @NotNull AutomationService.TriggerType triggerType,
            UUID triggerBoardId,
            UUID triggerColumnId,
            @NotNull AutomationService.ActionType actionType,
            @NotEmpty List<@NotNull UUID> actionUserIds) {}
    public record VersionRequest(@PositiveOrZero long version) {}
}
