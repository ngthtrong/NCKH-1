package vn.edu.ctu.saas.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.ProjectStatus;

public final class ApplicationDtos {
    private ApplicationDtos() {}

    public record DashboardView(long projects, long boards, long openTasks, long overdueTasks, long unreadNotifications) {}

    public record ProjectView(
            UUID id,
            String name,
            String description,
            ProjectStatus status,
            UUID createdBy,
            Instant createdAt,
            Instant updatedAt,
            ProjectRole role,
            UUID boardId,
            long memberCount,
            long taskCount,
            long completedTaskCount) {}
    public record CreateProjectRequest(@NotBlank @Size(max = 160) String name, @Size(max = 5000) String description) {}
    public record UpdateProjectRequest(@NotBlank @Size(max = 160) String name, @Size(max = 5000) String description) {}
    public record ChangeProjectStatusRequest(@NotNull ProjectStatus status) {}
    public record ProjectMemberView(UUID projectId, UUID userId, ProjectRole role) {}
    public record SetProjectMemberRequest(@NotNull ProjectRole role) {}

    public record BoardView(
            UUID id,
            UUID projectId,
            String name,
            long version,
            List<ColumnView> columns,
            List<TaskView> tasks) {}
    public record BoardSummaryView(UUID id, UUID projectId, String name, long version, Instant createdAt) {}
    public record ColumnView(UUID id, String name, BigDecimal position) {}
    public record CreateBoardRequest(@NotBlank @Size(max = 160) String name) {}
    public record UpdateBoardRequest(
            @NotBlank @Size(max = 160) String name,
            @NotNull @PositiveOrZero Long version) {}
    public record CreateColumnRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull @PositiveOrZero Long version) {}
    public record UpdateColumnRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull @PositiveOrZero Long version) {}
    public record ReorderColumnsRequest(
            @NotEmpty List<@NotNull UUID> columnIds,
            @NotNull @PositiveOrZero Long version) {}

    public record TaskView(
            UUID id,
            UUID projectId,
            UUID boardId,
            UUID columnId,
            UUID parentTaskId,
            String title,
            String description,
            UUID assigneeUserId,
            Instant dueAt,
            BigDecimal position,
            long version,
            Instant createdAt,
            Instant updatedAt) {}
    public record CreateTaskRequest(
            @NotNull UUID columnId,
            UUID parentTaskId,
            @NotBlank @Size(max = 240) String title,
            @Size(max = 10000) String description,
            UUID assigneeUserId,
            Instant dueAt,
            BigDecimal position) {}
    public record UpdateTaskRequest(
            @NotNull UUID columnId,
            @NotBlank @Size(max = 240) String title,
            @Size(max = 10000) String description,
            UUID assigneeUserId,
            Instant dueAt,
            BigDecimal position,
            long version) {}
    public record MoveTaskRequest(@NotNull UUID targetColumnId, @NotNull BigDecimal targetPosition, long version) {}
    public record ReorderTaskItem(
            @NotNull UUID taskId,
            @NotNull UUID targetColumnId,
            @NotNull BigDecimal targetPosition,
            @NotNull @PositiveOrZero Long version) {}
    public record ReorderTasksRequest(@NotEmpty List<@NotNull ReorderTaskItem> items) {}
    public record CommentView(UUID id, UUID taskId, UUID authorUserId, String body, Instant createdAt) {}
    public record CreateCommentRequest(@NotBlank @Size(max = 10000) String body) {}
    public record UpdateCommentRequest(@NotBlank @Size(max = 10000) String body) {}
}
