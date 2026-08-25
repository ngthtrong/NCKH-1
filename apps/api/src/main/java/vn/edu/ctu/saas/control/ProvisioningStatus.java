package vn.edu.ctu.saas.control;

public enum ProvisioningStatus {
    QUEUED,
    RUNNING,
    SUCCEEDED,
    RETRYABLE_FAILED,
    FAILED_ROLLED_BACK
}

