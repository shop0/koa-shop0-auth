# `@shop0/koa-shop0-auth`

![Build Status](https://github.com/shop0/koa-shop0-auth/workflows/CI/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md) [![npm version](https://badge.fury.io/js/%40shop0%2Fkoa-shop0-auth.svg)](https://badge.fury.io/js/%40shop0%2Fkoa-shop0-auth)

用于认证[shop0](https://shop0.growingbox.cn/)的 [Koa](http://koajs.com/)中间件.

[`@shop0/shop0-express`](https://www.npmjs.com/package/@shop0/shop0-express)的子模块，但是更简单.

Features you might know from the express module like the webhook middleware and proxy will be presented as their [own packages instead](https://github.com/shop0/quilt/blob/master/packages/koa-shop0-graphql-proxy/README.md).

## 安装

This package builds upon the [shop0 Node Library](https://github.com/shop0/shop0-node-api), so your app will have access to all of the library's features as well as the Koa-specific middlewares this package provides.

```bash
$ yarn add @shop0/koa-shop0-auth
```

## 使用

This package exposes `shop0Auth` by default, and `verifyRequest` as a named export. To make it ready for use, you need to initialize the shop0 Library and then use that to initialize this package:

```js
import shop0Auth, { verifyRequest } from "@shop0/koa-shop0-auth";
import shop0, { ApiVersion } from "@shop0/shop0-api";

// Initialize the library
shop0.Context.initialize({
  API_KEY: "Your API_KEY",
  API_SECRET_KEY: "Your API_SECRET_KEY",
  SCOPES: ["Your scopes"],
  HOST_NAME: "Your HOST_NAME (omit the https:// part)",
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  // More information at https://github.com/shop0/shop0-node-api/blob/main/docs/issues.md#notes-on-session-handling
  SESSION_STORAGE: new shop0.Session.MemorySessionStorage(),
});
```

### shop0Auth

Returns an authentication middleware taking up (by default) the routes `/auth` and `/auth/callback`.

```js
app.use(
  shop0Auth({
    // if specified, mounts the routes off of the given path
    // eg. /shop0/auth, /shop0/auth/callback
    // defaults to ''
    prefix: "/shop0",
    // set access mode, default is 'online'
    accessMode: "offline",
    // callback for when auth is completed
    afterAuth(ctx) {
      const { shop, accessToken } = ctx.state.shop0;

      console.log("We did it!", accessToken);

      ctx.redirect("/");
    },
  })
);
```

#### `/auth`

This route starts the oauth process. It expects a `?shop` parameter and will error out if one is not present. To install it in a store just go to `/auth?shop=myStoreSubdomain`.

### `/auth/callback`

You should never have to manually go here. This route is purely for shop0 to send data back during the oauth process.

### `verifyRequest`

Returns a middleware to verify requests before letting them further in the chain.

**Note**: if you're using a prefix for `shop0Auth`, that prefix needs to be present in the paths for `authRoute` and `fallbackRoute` below.

```javascript
app.use(
  verifyRequest({
    // path to redirect to if verification fails
    // defaults to '/auth'
    authRoute: "/foo/auth",
    // path to redirect to if verification fails and there is no shop on the query
    // defaults to '/auth'
    fallbackRoute: "/install",
    // which access mode is being used
    // defaults to 'online'
    accessMode: "offline",
    // if false, redirect the user to OAuth. If true, send back a 403 with the following headers:
    //  - X-shop0-API-Request-Failure-Reauthorize: '1'
    //  - X-shop0-API-Request-Failure-Reauthorize-Url: '<auth_url_path>'
    // defaults to false
    returnHeader: true,
  })
);
```

### Migrating from cookie-based authentication to session tokens

Versions prior to v4 of this package used cookies to store session information for your app. However, internet browsers have been moving to block 3rd party cookies, which creates issues for embedded apps.

If you have an app using this package, you can migrate from cookie-based authentication to session tokens by performing a few steps:

- Upgrade your `@shop0/koa-shop0-auth` dependency to v4+
- Update your server as per the [Usage](#usage) instructions to properly initialize the `@shop0/shop0-api` library
- If you are using `accessMode: 'offline'` in `shop0Auth`, make sure to pass the same value in `verifyRequest`
- Install `@shop0/app-bridge-utils` in your frontend app
- In your frontend app, replace `fetch` calls with `authenticatedFetch` from App Bridge Utils

**Note**: the backend steps need to be performed to fully migrate your app to v4, even if your app is not embedded.

You can learn more about session tokens in our [authentication tutorial](https://shop0.dev/tutorials/authenticate-your-app-using-session-tokens). Go to the **frontend** changes section under **Setup** for instructions and examples on how to update your frontend code.

### Example app

This example will enable you to quickly set up the backend for a working development app. Please read the [Gotchas](#gotchas) session below to make sure you are ready for production use.

```javascript
import "isomorphic-fetch";

import Koa from "koa";
import Router from "koa-router";
import shop0Auth, { verifyRequest } from "@shop0/koa-shop0-auth";
import shop0, { ApiVersion } from "@shop0/shop0-api";

// Loads the .env file into process.env. This is usually done using actual environment variables in production
import dotenv from "dotenv";
dotenv.config();

const port = parseInt(process.env.PORT, 10) || 8081;

// initializes the library
shop0.Context.initialize({
  API_KEY: process.env.SHOP0_API_KEY,
  API_SECRET_KEY: process.env.SHOP0_API_SECRET,
  SCOPES: process.env.SHOP0_APP_SCOPES,
  HOST_NAME: process.env.SHOP0_APP_URL.replace(/^https:\/\//, ""),
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  // More information at https://github.com/shop0/shop0-node-api/blob/main/docs/issues.md#notes-on-session-handling
  SESSION_STORAGE: new shop0.Session.MemorySessionStorage(),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOP0_SHOPS = {};

const app = new Koa();
const router = new Router();
app.keys = [shop0.Context.API_SECRET_KEY];

// Sets up shop0 auth
app.use(
  shop0Auth({
    async afterAuth(ctx) {
      const { shop, accessToken } = ctx.state.shop0;
      ACTIVE_SHOP0_SHOPS[shop] = true;

      // Your app should handle the APP_UNINSTALLED webhook to make sure merchants go through OAuth if they reinstall it
      const response = await shop0.Webhooks.Registry.register({
        shop,
        accessToken,
        path: "/webhooks",
        topic: "APP_UNINSTALLED",
        webhookHandler: async (topic, shop, body) =>
          delete ACTIVE_SHOP0_SHOPS[shop],
      });

      if (!response.success) {
        console.log(
          `Failed to register APP_UNINSTALLED webhook: ${response.result}`
        );
      }

      // Redirect to app with shop parameter upon auth
      ctx.redirect(`/?shop=${shop}`);
    },
  })
);

router.get("/", async (ctx) => {
  const shop = ctx.query.shop;

  // If this shop hasn't been seen yet, go through OAuth to create a session
  if (ACTIVE_SHOP0_SHOPS[shop] === undefined) {
    ctx.redirect(`/auth?shop=${shop}`);
  } else {
    // Load app skeleton. Don't include sensitive information here!
    ctx.body = "🎉";
  }
});

router.post("/webhooks", async (ctx) => {
  try {
    await shop0.Webhooks.Registry.process(ctx.req, ctx.res);
    console.log(`Webhook processed, returned status code 200`);
  } catch (error) {
    console.log(`Failed to process webhook: ${error}`);
  }
});

// Everything else must have sessions
router.get("(.*)", verifyRequest(), async (ctx) => {
  // Your application code goes here
});

app.use(router.allowedMethods());
app.use(router.routes());
app.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
```

## Gotchas

### Session

The provided `MemorySessionStorage` class may not be scalable for production use. You can implement your own strategy by creating a class that implements a few key methods. Learn more about [how the shop0 Library handles sessions](https://github.com/shop0/shop0-node-api/blob/main/docs/issues.md#notes-on-session-handling).

### Testing locally

By default this app requires that you use a `myshop0.com` host in the `shop` parameter. You can modify this to test against a local/staging environment via the `myshop0Domain` option to `shop0Auth` (e.g. `myshop0.io`).
