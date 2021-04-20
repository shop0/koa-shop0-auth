import "../../test/test_helper";

import shop0 from "@shop0/shop0-api";
import setUserAgent, { KOA_USER_AGENT_PREFIX } from "../set-user-agent";

describe("setUserAgent", () => {
  it("sets the user agent if it is empty", () => {
    expect(shop0.Context.USER_AGENT_PREFIX).toBeUndefined();

    setUserAgent();
    expect(shop0.Context.USER_AGENT_PREFIX).toEqual(KOA_USER_AGENT_PREFIX);

    setUserAgent();
    expect(shop0.Context.USER_AGENT_PREFIX).toEqual(KOA_USER_AGENT_PREFIX);
  });

  it("sets the user agent if it is set", () => {
    expect(shop0.Context.USER_AGENT_PREFIX).toBeUndefined();

    const testPrefix = "Test user agent";
    shop0.Context.USER_AGENT_PREFIX = testPrefix;
    shop0.Context.initialize(shop0.Context);

    setUserAgent();
    expect(shop0.Context.USER_AGENT_PREFIX).toEqual(
      `${testPrefix} | ${KOA_USER_AGENT_PREFIX}`
    );

    setUserAgent();
    expect(shop0.Context.USER_AGENT_PREFIX).toEqual(
      `${testPrefix} | ${KOA_USER_AGENT_PREFIX}`
    );
  });
});
