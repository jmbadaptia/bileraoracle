import { defineMiddleware } from "astro:middleware";

const PARENT_DOMAIN = (process.env.MINI_SITE_DOMAIN || "").toLowerCase();
const RESERVED_SUBDOMAINS = new Set(["www", "bilera", "admin", "api", "sites"]);

export const onRequest = defineMiddleware(async (context, next) => {
  if (!PARENT_DOMAIN) return next();

  const hostHeader = context.request.headers.get("host") || "";
  const hostname = hostHeader.split(":")[0].toLowerCase();

  if (!hostname.endsWith(`.${PARENT_DOMAIN}`)) return next();

  const subdomain = hostname.slice(0, -1 - PARENT_DOMAIN.length);
  if (!subdomain || subdomain.includes(".")) return next();
  if (RESERVED_SUBDOMAINS.has(subdomain)) return next();

  const url = new URL(context.request.url);
  if (url.pathname === "/") {
    return context.rewrite(`/${subdomain}`);
  }

  return next();
});
