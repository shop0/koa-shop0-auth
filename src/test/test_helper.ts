import shop0, { ApiVersion } from "@shop0/shop0-api";
import { MemorySessionStorage } from "@shop0/shop0-api/dist/auth/session";

beforeEach(() => {
  // We want to reset the Context object on every run so that tests start with a consistent state
  shop0.Context.initialize({
    API_KEY: "test_key",
    API_SECRET_KEY: "test_secret_key",
    SCOPES: ["test_scope"],
    HOST_NAME: "test_host_name",
    API_VERSION: ApiVersion.Unstable,
    IS_EMBEDDED_APP: true,
    SESSION_STORAGE: new MemorySessionStorage(),
  });
  shop0.Context.USER_AGENT_PREFIX = undefined;
});
