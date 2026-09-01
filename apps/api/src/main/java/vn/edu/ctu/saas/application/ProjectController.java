package vn.edu.ctu.saas.application;

import static vn.edu.ctu.saas.application.ApplicationDtos.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ProjectController {
    private final ProjectApplicationService service;

    public ProjectController(ProjectApplicationService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public DashboardView dashboard() { return service.dashboard(); }

    @GetMapping("/projects")
    public List<ProjectView> projects() { return service.listProjects(); }

    @PostMapping("/projects")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectView createProject(@Valid @RequestBody CreateProjectRequest request) {
        return service.createProject(request);
    }

    @PutMapping("/projects/{projectId}")
    public ProjectView updateProject(@PathVariable UUID projectId, @Valid @RequestBody UpdateProjectRequest request) {
        return service.updateProject(projectId, request);
    }

    @PatchMapping("/projects/{projectId}/status")
    public ProjectView changeProjectStatus(
            @PathVariable UUID projectId,
            @Valid @RequestBody ChangeProjectStatusRequest request) {
        return service.changeProjectStatus(projectId, request);
    }

    @DeleteMapping("/projects/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable UUID projectId) { service.deleteProject(projectId); }

    @GetMapping("/projects/{projectId}/members")
    public List<ProjectMemberView> projectMembers(@PathVariable UUID projectId) {
        return service.projectMembers(projectId);
    }

    @PutMapping("/projects/{projectId}/members/{userId}")
    public ProjectMemberView setProjectMember(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            @Valid @RequestBody SetProjectMemberRequest request) {
        return service.setProjectMember(projectId, userId, request);
    }

    @DeleteMapping("/projects/{projectId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeProjectMember(@PathVariable UUID projectId, @PathVariable UUID userId) {
        service.removeProjectMember(projectId, userId);
    }

    @PostMapping("/projects/{projectId}/boards")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardView createBoard(@PathVariable UUID projectId, @Valid @RequestBody CreateBoardRequest request) {
        return service.createBoard(projectId, request);
    }

    @GetMapping("/projects/{projectId}/boards")
    public List<BoardSummaryView> projectBoards(@PathVariable UUID projectId) {
        return service.projectBoards(projectId);
    }

    @GetMapping("/boards/{boardId}")
    public BoardView board(@PathVariable UUID boardId) { return service.getBoard(boardId); }

    @PutMapping("/boards/{boardId}")
    public BoardView updateBoard(@PathVariable UUID boardId, @Valid @RequestBody UpdateBoardRequest request) {
        return service.updateBoard(boardId, request);
    }

    @DeleteMapping("/boards/{boardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBoard(@PathVariable UUID boardId) { service.deleteBoard(boardId); }

    @PostMapping("/boards/{boardId}/columns")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardView createColumn(
            @PathVariable UUID boardId,
            @Valid @RequestBody CreateColumnRequest request) {
        return service.createColumn(boardId, request);
    }

    @PatchMapping("/boards/{boardId}/columns/{columnId}")
    public BoardView updateColumn(
            @PathVariable UUID boardId,
            @PathVariable UUID columnId,
            @Valid @RequestBody UpdateColumnRequest request) {
        return service.updateColumn(boardId, columnId, request);
    }

    @PutMapping("/boards/{boardId}/columns/order")
    public BoardView reorderColumns(
            @PathVariable UUID boardId,
            @Valid @RequestBody ReorderColumnsRequest request) {
        return service.reorderColumns(boardId, request);
    }

    @DeleteMapping("/boards/{boardId}/columns/{columnId}")
    public BoardView deleteColumn(
            @PathVariable UUID boardId,
            @PathVariable UUID columnId,
            @RequestParam long version) {
        return service.deleteColumn(boardId, columnId, version);
    }

    @PostMapping("/boards/{boardId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskView createTask(@PathVariable UUID boardId, @Valid @RequestBody CreateTaskRequest request) {
        return service.createTask(boardId, request);
    }

    @PatchMapping("/tasks/{taskId}")
    public TaskView updateTask(@PathVariable UUID taskId, @Valid @RequestBody UpdateTaskRequest request) {
        return service.updateTask(taskId, request);
    }

    @PatchMapping("/boards/{boardId}/tasks/{taskId}/position")
    public TaskView moveTask(
            @PathVariable UUID boardId,
            @PathVariable UUID taskId,
            @Valid @RequestBody MoveTaskRequest request) {
        return service.moveTask(boardId, taskId, request);
    }

    @PutMapping("/boards/{boardId}/tasks/order")
    public BoardView reorderTasks(
            @PathVariable UUID boardId,
            @Valid @RequestBody ReorderTasksRequest request) {
        return service.reorderTasks(boardId, request);
    }

    @GetMapping("/tasks/{taskId}")
    public TaskView task(@PathVariable UUID taskId) { return service.getTask(taskId); }

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable UUID taskId) { service.deleteTask(taskId); }

    @GetMapping("/tasks/{taskId}/comments")
    public List<CommentView> comments(@PathVariable UUID taskId) { return service.comments(taskId); }

    @PostMapping("/tasks/{taskId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentView addComment(@PathVariable UUID taskId, @Valid @RequestBody CreateCommentRequest request) {
        return service.addComment(taskId, request);
    }

    @PatchMapping("/comments/{commentId}")
    public CommentView updateComment(
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequest request) {
        return service.updateComment(commentId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable UUID commentId) { service.deleteComment(commentId); }
}
