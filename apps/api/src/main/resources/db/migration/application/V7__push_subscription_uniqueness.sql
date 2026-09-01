CREATE UNIQUE INDEX uq_push_subscriptions_user_endpoint
    ON push_subscriptions(tenant_id, user_id, endpoint);
