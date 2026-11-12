package vn.edu.ctu.saas.customization;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenant-settings/kanban")
public class PooledKanbanController {
    private final PooledKanbanService service;
    public PooledKanbanController(PooledKanbanService service) { this.service = service; }
    @GetMapping public PooledKanbanService.View get() { return service.get(); }
    @PutMapping public PooledKanbanService.View update(@RequestBody PooledKanbanService.View request) {
        return service.update(request);
    }
}
