import "../../test/test_helper";

// Mock out the entire shop0 lib responses here so we don't have to deal with cookies and the underlying request
// modules
jest.mock("@shop0/shop0-api");
import shop0 from "@shop0/shop0-api";

import { createMockContext } from "@shop0/jest-koa-mocks";
import querystring from "querystring";
import crypto from "crypto";

import createshop0Auth from "../index";
import createTopLevelOAuthRedirect from "../create-top-level-oauth-redirect";
import { OAuthStartOptions } from "../../types";
import { KOA_USER_AGENT_PREFIX } from "../set-user-agent";

const mockTopLevelOAuthRedirect = jest.fn();
jest.mock("../create-top-level-oauth-redirect", () =>
  jest.fn(() => mockTopLevelOAuthRedirect)
);

const mockRequestStorageAccess = jest.fn();
jest.mock("../create-request-storage-access", () => () =>
  mockRequestStorageAccess
);

const mockEnableCookies = jest.fn();
jest.mock("../create-enable-cookies", () => () => mockEnableCookies);

const baseUrl = "https://myapp.com/auth";
const shop = "test-shop.myshop0.io";

const baseConfig: OAuthStartOptions = {
  accessMode: "offline",
};

function nextFunction() {}

describe("Index", () => {
  beforeEach(() => {
    shop0.Auth.beginAuth = jest.fn(() =>
      Promise.resolve(`https://${shop}/auth/callback`)
    );

    const session = new shop0.Session.Session("test_session");
    session.shop = shop;
    session.accessToken = "test_token";
    shop0.Utils.loadCurrentSession = jest.fn(() => Promise.resolve(session));
  });

  describe("with the /auth path", () => {
    describe("with no test cookie", () => {
      it("redirects to request storage access", async () => {
        const shop0Auth = createshop0Auth(baseConfig);
        const ctx = createMockContext({
          url: baseUrl,
        });

        await shop0Auth(ctx, nextFunction);

        expect(mockRequestStorageAccess).toHaveBeenCalledWith(ctx);
      });
    });

    describe("with no test cookie but a granted storage access cookie", () => {
      it("redirects to /auth/inline at the top-level", async () => {
        const shop0Auth = createshop0Auth(baseConfig);
        const ctx = createMockContext({
          url: baseUrl,
          cookies: { "shop0.granted_storage_access": "1" },
        });

        await shop0Auth(ctx, nextFunction);

        expect(createTopLevelOAuthRedirect).toHaveBeenCalledWith(
          shop0.Context.API_KEY,
          "/auth/inline"
        );
        expect(mockTopLevelOAuthRedirect).toHaveBeenCalledWith(ctx);
      });
    });

    describe("with a test cookie but not top-level cookie", () => {
      it("redirects to /auth/inline at the top-level", async () => {
        const shop0Auth = createshop0Auth(baseConfig);
        const ctx = createMockContext({
          url: baseUrl,
          cookies: { shop0TestCookie: "1" },
        });

        await shop0Auth(ctx, nextFunction);

        expect(createTopLevelOAuthRedirect).toHaveBeenCalledWith(
          shop0.Context.API_KEY,
          "/auth/inline"
        );
        expect(mockTopLevelOAuthRedirect).toHaveBeenCalledWith(ctx);
      });
    });

    describe("with a test cookie and a top-level cookie", () => {
      it("performs inline oauth", async () => {
        const shop0Auth = createshop0Auth(baseConfig);
        const ctx = createMockContext({
          url: `${baseUrl}?shop=${shop}`,
          cookies: { shop0TestCookie: "1", shop0TopLevelOAuth: "1" },
        });

        await shop0Auth(ctx, nextFunction);
        expect(ctx.redirect).toHaveBeenCalledTimes(1);

        const url = new URL((ctx.redirect as jest.Mock).mock.calls[0][0]);
        expect(url.hostname).toEqual(shop);
      });
    });
  });

  describe("with the /auth/inline path", () => {
    it("performs inline oauth", async () => {
      const shop0Auth = createshop0Auth(baseConfig);
      const ctx = createMockContext({
        url: `${baseUrl}/inline?shop=${shop}`,
      });

      await shop0Auth(ctx, nextFunction);
      expect(ctx.redirect).toHaveBeenCalledTimes(1);

      const url = new URL((ctx.redirect as jest.Mock).mock.calls[0][0]);
      expect(url.hostname).toEqual(shop);
    });

    it("throws a 400 when no shop query parameter is given", async () => {
      const shop0Auth = createshop0Auth(baseConfig);
      const ctx = createMockContext({
        url: `${baseUrl}/inline`,
      });

      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).toHaveBeenCalledWith(400);
    });
  });

  describe("with the /auth/callback path", () => {
    const baseCallbackUrl = "https://myapp.com/auth/callback";
    const nonce = "totallyrealnonce";
    const queryData = {
      code: "def",
      shop: shop,
      state: nonce,
      hmac: "abc",
    };

    beforeEach(() => {
      shop0.Auth.validateAuthCallback = jest.fn(() => Promise.resolve());
    });

    it("performs oauth callback", async () => {
      let ctx = createMockContext({
        url: `${baseCallbackUrl}?${querystring.stringify(queryData)}`,
        throw: jest.fn(),
      });

      const shop0Auth = createshop0Auth(baseConfig);
      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).not.toHaveBeenCalled();
      expect(ctx.state.shop0.shop).toEqual(shop);
    });

    it("performs oauth callback with offline sessions", async () => {
      let ctx = createMockContext({
        url: `${baseCallbackUrl}?${querystring.stringify(queryData)}`,
        throw: jest.fn(),
      });

      const shop0Auth = createshop0Auth({
        ...baseConfig,
        accessMode: "offline",
      });
      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).not.toHaveBeenCalled();
      expect(ctx.state.shop0.shop).toEqual(shop);
    });

    it("calls afterAuth with ctx when the token request succeeds", async () => {
      const afterAuth = jest.fn();

      let ctx = createMockContext({
        url: `${baseCallbackUrl}?${querystring.stringify(queryData)}`,
        throw: jest.fn(),
      });

      const shop0Auth = createshop0Auth({
        ...baseConfig,
        afterAuth,
      });
      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).not.toHaveBeenCalled();
      expect(ctx.state.shop0.shop).toEqual(shop);
      expect(afterAuth).toHaveBeenCalledWith(ctx);
    });

    it("throws a 400 if the OAuth callback is invalid", async () => {
      shop0.Auth.validateAuthCallback = jest.fn(() =>
        Promise.reject(new shop0.Errors.InvalidOAuthError())
      );

      const ctx = createMockContext({
        url: baseCallbackUrl,
        throw: jest.fn(),
      });

      const shop0Auth = createshop0Auth(baseConfig);
      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).toHaveBeenCalledWith(400, "");
    });

    it("throws a 403 if the session does not exist", async () => {
      shop0.Auth.validateAuthCallback = jest.fn(() =>
        Promise.reject(new shop0.Errors.SessionNotFound())
      );

      const ctx = createMockContext({
        url: `${baseCallbackUrl}?${querystring.stringify(queryData)}`,
        throw: jest.fn(),
      });

      const shop0Auth = createshop0Auth(baseConfig);
      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).toHaveBeenCalledWith(403, "");
    });

    it("throws a 500 on any other errors", async () => {
      shop0.Auth.validateAuthCallback = jest.fn(() =>
        Promise.reject(new shop0.Errors.shop0Error())
      );

      const ctx = createMockContext({
        url: `${baseCallbackUrl}?${querystring.stringify(queryData)}`,
        throw: jest.fn(),
      });

      const shop0Auth = createshop0Auth(baseConfig);
      await shop0Auth(ctx, nextFunction);

      expect(ctx.throw).toHaveBeenCalledWith(500, "");
    });
  });

  describe("with the /auth/enable_cookies path", () => {
    it("renders the enable_cookies page", async () => {
      const shop0Auth = createshop0Auth(baseConfig);
      const ctx = createMockContext({
        url: `${baseUrl}/enable_cookies`,
      });

      await shop0Auth(ctx, nextFunction);

      expect(mockEnableCookies).toHaveBeenCalledWith(ctx);
    });
  });

  it("always sets the user agent prefix", () => {
    expect(shop0.Context.USER_AGENT_PREFIX).toBeUndefined();

    const shop0Auth = createshop0Auth(baseConfig);
    expect(shop0.Context.USER_AGENT_PREFIX).toEqual(KOA_USER_AGENT_PREFIX);
  });
});
