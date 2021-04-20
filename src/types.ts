import { Context } from "koa";

export type AccessMode = "online" | "offline";

export interface AuthConfig {
  myshop0Domain?: string;
  accessMode?: "online" | "offline";
  afterAuth?(ctx: Context): void;
}

export interface OAuthStartOptions extends AuthConfig {
  prefix?: string;
}

export interface NextFunction {
  (): any;
}
