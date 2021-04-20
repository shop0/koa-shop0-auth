import shop0 from "@shop0/shop0-api";

export const KOA_USER_AGENT_PREFIX = "Koa shop0 Auth";

export default function setUserAgent() {
  if (!shop0.Context.USER_AGENT_PREFIX) {
    shop0.Context.USER_AGENT_PREFIX = KOA_USER_AGENT_PREFIX;
  } else if (!shop0.Context.USER_AGENT_PREFIX.includes(KOA_USER_AGENT_PREFIX)) {
    shop0.Context.USER_AGENT_PREFIX = `${shop0.Context.USER_AGENT_PREFIX} | ${KOA_USER_AGENT_PREFIX}`;
  }
}
