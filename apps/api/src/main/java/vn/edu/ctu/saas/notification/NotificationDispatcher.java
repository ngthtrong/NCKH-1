package vn.edu.ctu.saas.notification;

import vn.edu.ctu.saas.control.UserAccountEntity;

public interface NotificationDispatcher {
    void dispatch(TenantEvent event, UserAccountEntity recipient);
}
