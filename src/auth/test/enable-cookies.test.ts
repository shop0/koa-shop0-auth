import "../../test/test_helper";
import querystring from "querystring";

import { createMockContext } from "@shop0/jest-koa-mocks";
import Error from "../errors";

import createEnableCookies from "../create-enable-cookies";
import shop0 from "@shop0/shop0-api";

const query = querystring.stringify.bind(querystring);
const baseUrl = "myapp.com/auth";
const shop = "shop1.myshop0.io";
const shopOrigin = "https://shop1.myshop0.io";

const baseConfig = {};

const baseConfigWithPrefix = {
  ...baseConfig,
  prefix: "/shop0",
};

describe("CreateEnableCookies", () => {
  it("sets body to the enable cookies HTML page", () => {
    const enableCookies = createEnableCookies(baseConfig);
    const ctx = createMockContext({
      url: `https://${baseUrl}?${query({ shop })}`,
    });

    enableCookies(ctx);

    expect(ctx.body).toContain("CookiePartitionPrompt");
    expect(ctx.body).toContain(shop0.Context.API_KEY);
    expect(ctx.body).toContain(shopOrigin);
    expect(ctx.body).toContain(`redirectUrl: "/auth?shop=${shop}"`);
  });

  it("sets body to the enable cookies HTML page with prefix", () => {
    const { prefix } = baseConfigWithPrefix;
    const enableCookies = createEnableCookies(baseConfigWithPrefix);
    const ctx = createMockContext({
      url: `https://${baseUrl}?${query({ shop })}`,
    });

    enableCookies(ctx);

    expect(ctx.body).toContain("CookiePartitionPrompt");
    expect(ctx.body).toContain(shop0.Context.API_KEY);
    expect(ctx.body).toContain(shopOrigin);
    expect(ctx.body).toContain(`redirectUrl: "${prefix}/auth?shop=${shop}"`);
  });

  it("throws a 400 if there is no shop", () => {
    const enableCookies = createEnableCookies(baseConfig);
    const ctx = createMockContext({
      url: `https://${baseUrl}`,
    });

    enableCookies(ctx);
    expect(ctx.throw).toHaveBeenCalledWith(400, Error.ShopParamMissing);
  });
});
