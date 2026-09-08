package vn.edu.ctu.saas.customization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class CustomDataController {
    private final CustomDataService service;

    public CustomDataController(CustomDataService service) {
        this.service = service;
    }

    @GetMapping("/projects/{projectId}/custom-definitions")
    public List<DefinitionResponse> definitions(@PathVariable UUID projectId) {
        return service.definitions(projectId).stream().map(DefinitionResponse::from).toList();
    }

    @PostMapping("/projects/{projectId}/custom-definitions")
    public DefinitionResponse createDefinition(
            @PathVariable UUID projectId, @Valid @RequestBody CreateDefinitionRequest request) {
        return DefinitionResponse.from(service.createDefinition(projectId, request.kind(), request.displayName()));
    }

    @DeleteMapping("/custom-definitions/{definitionId}")
    public void deleteDefinition(@PathVariable UUID definitionId, @RequestParam long version) {
        service.deleteDefinition(definitionId, version);
    }

    @PostMapping("/custom-definitions/{definitionId}/restore")
    public DefinitionResponse restoreDefinition(@PathVariable UUID definitionId, @RequestParam long version) {
        return DefinitionResponse.from(service.restoreDefinition(definitionId, version));
    }

    @PostMapping("/custom-definitions/{definitionId}/fields")
    public DefinitionResponse addField(
            @PathVariable UUID definitionId, @Valid @RequestBody CreateFieldRequest request) {
        return DefinitionResponse.from(service.addField(
                definitionId, request.displayName(), request.dataType(), request.required(),
                request.position(), request.options()));
    }

    @PatchMapping("/custom-definitions/{definitionId}/fields/{fieldId}")
    public DefinitionResponse updateField(
            @PathVariable UUID definitionId,
            @PathVariable UUID fieldId,
            @Valid @RequestBody UpdateFieldRequest request) {
        return DefinitionResponse.from(service.updateField(
                definitionId, fieldId, request.displayName(), request.required(), request.position(),
                request.options(), request.version()));
    }

    @DeleteMapping("/custom-definitions/{definitionId}/fields/{fieldId}")
    public void deleteField(
            @PathVariable UUID definitionId, @PathVariable UUID fieldId, @RequestParam long version) {
        service.deleteField(definitionId, fieldId, version);
    }

    @PostMapping("/custom-definitions/{definitionId}/fields/{fieldId}/restore")
    public DefinitionResponse restoreField(
            @PathVariable UUID definitionId, @PathVariable UUID fieldId, @RequestParam long version) {
        return DefinitionResponse.from(service.restoreField(definitionId, fieldId, version));
    }

    @GetMapping("/projects/{projectId}/custom-schema-jobs")
    public List<CustomDataService.SchemaJobView> schemaJobs(@PathVariable UUID projectId) {
        return service.schemaJobs(projectId);
    }

    @GetMapping("/custom-definitions/{definitionId}/records")
    public List<CustomDataService.RecordView> records(@PathVariable UUID definitionId) {
        return service.records(definitionId);
    }

    @PostMapping("/custom-definitions/{definitionId}/records")
    public CustomDataService.RecordView createRecord(
            @PathVariable UUID definitionId, @RequestBody ValuesRequest request) {
        return service.createRecord(definitionId, request.values());
    }

    @PutMapping("/custom-definitions/{definitionId}/records/{recordId}")
    public CustomDataService.RecordView updateRecord(
            @PathVariable UUID definitionId,
            @PathVariable UUID recordId,
            @Valid @RequestBody VersionedValuesRequest request) {
        return service.updateRecord(definitionId, recordId, request.values(), request.version());
    }

    @DeleteMapping("/custom-definitions/{definitionId}/records/{recordId}")
    public void deleteRecord(
            @PathVariable UUID definitionId, @PathVariable UUID recordId, @RequestParam long version) {
        service.deleteRecord(definitionId, recordId, version);
    }

    @GetMapping("/tasks/{taskId}/custom-values")
    public TaskValuesResponse taskValues(@PathVariable UUID taskId) {
        return TaskValuesResponse.from(service.taskValues(taskId));
    }

    @PutMapping("/tasks/{taskId}/custom-values")
    public TaskValuesResponse updateTaskValues(
            @PathVariable UUID taskId, @Valid @RequestBody VersionedValuesRequest request) {
        return TaskValuesResponse.from(service.updateTaskValues(taskId, request.values(), request.version()));
    }

    public record CreateDefinitionRequest(@NotNull CustomDefinitionKind kind, @NotBlank String displayName) {}
    public record CreateFieldRequest(
            @NotBlank String displayName,
            @NotNull CustomFieldType dataType,
            boolean required,
            int position,
            @Size(max = 50) List<String> options) {}
    public record UpdateFieldRequest(
            @NotBlank String displayName,
            boolean required,
            int position,
            @Size(max = 50) List<String> options,
            @PositiveOrZero long version) {}
    public record ValuesRequest(@NotNull Map<String, Object> values) {}
    public record VersionedValuesRequest(
            @NotNull Map<String, Object> values, @PositiveOrZero long version) {}

    public record DefinitionResponse(
            UUID id, UUID projectId, CustomDefinitionKind kind, String displayName, String status,
            long version, String lastError, List<FieldResponse> fields) {
        static DefinitionResponse from(CustomDataService.DefinitionView value) {
            return new DefinitionResponse(
                    value.id(), value.projectId(), value.kind(), value.displayName(), value.status(),
                    value.version(), value.lastError(), value.fields().stream().map(FieldResponse::from).toList());
        }
    }

    public record FieldResponse(
            UUID id, String displayName, CustomFieldType dataType, List<String> options,
            boolean required, int position, String status, long version, String lastError) {
        static FieldResponse from(CustomDataService.FieldView value) {
            return new FieldResponse(
                    value.id(), value.displayName(), value.dataType(), value.options(), value.required(),
                    value.position(), value.status(), value.version(), value.lastError());
        }
    }

    public record TaskValuesResponse(DefinitionResponse definition, Map<String, Object> values, long version) {
        static TaskValuesResponse from(CustomDataService.TaskCustomDataView value) {
            return new TaskValuesResponse(
                    value.definition() == null ? null : DefinitionResponse.from(value.definition()),
                    value.values(), value.version());
        }
    }
}
