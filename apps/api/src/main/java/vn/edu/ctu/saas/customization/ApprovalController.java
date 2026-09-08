package vn.edu.ctu.saas.customization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ApprovalController {
    private final ApprovalService service;

    public ApprovalController(ApprovalService service) {
        this.service = service;
    }

    @GetMapping("/boards/{boardId}/approval-workflow")
    public ApprovalService.WorkflowView workflow(@PathVariable UUID boardId) {
        return service.workflow(boardId);
    }

    @PutMapping("/boards/{boardId}/approval-workflow")
    public ApprovalService.WorkflowView saveWorkflow(
            @PathVariable UUID boardId, @Valid @RequestBody SaveWorkflowRequest request) {
        return service.saveWorkflow(
                boardId, request.completionColumnId(), request.name(), request.enabled(),
                request.steps().stream().map(step -> new ApprovalService.StepInput(
                        step.name(), step.mode(), step.approverIds())).toList(), request.version());
    }

    @PostMapping("/tasks/{taskId}/approval-runs")
    public ApprovalService.RunView submit(@PathVariable UUID taskId) {
        return service.submit(taskId);
    }

    @GetMapping("/tasks/{taskId}/approval-runs")
    public List<ApprovalService.RunView> taskRuns(@PathVariable UUID taskId) {
        return service.taskRuns(taskId);
    }

    @PostMapping("/approval-runs/{runId}/decisions")
    public ApprovalService.RunView decide(
            @PathVariable UUID runId, @Valid @RequestBody DecisionRequest request) {
        return service.decide(runId, request.decision(), request.version());
    }

    @PostMapping("/approval-runs/{runId}/withdraw")
    public ApprovalService.RunView withdraw(
            @PathVariable UUID runId, @Valid @RequestBody VersionRequest request) {
        return service.withdraw(runId, request.version());
    }

    @PatchMapping("/approval-runs/{runId}/steps/{position}/approvers")
    public ApprovalService.RunView replaceApprover(
            @PathVariable UUID runId,
            @PathVariable @Positive int position,
            @Valid @RequestBody ReplaceApproverRequest request) {
        return service.replaceApprover(
                runId, position, request.oldUserId(), request.newUserId(), request.version());
    }

    public record SaveWorkflowRequest(
            @NotNull UUID completionColumnId,
            @NotBlank String name,
            boolean enabled,
            @NotEmpty @Size(max = 20) List<@Valid StepRequest> steps,
            @PositiveOrZero long version) {}
    public record StepRequest(
            @NotBlank String name,
            @NotNull ApprovalService.ApprovalMode mode,
            @NotEmpty List<@NotNull UUID> approverIds) {}
    public record DecisionRequest(
            @NotNull ApprovalService.Decision decision, @PositiveOrZero long version) {}
    public record VersionRequest(@PositiveOrZero long version) {}
    public record ReplaceApproverRequest(
            @NotNull UUID oldUserId, @NotNull UUID newUserId, @PositiveOrZero long version) {}
}
