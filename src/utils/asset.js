// Resolve a runtime asset URL against Vite's base path.
//
// All asset paths in data/code are written root-absolute ("/assets/..."),
// which only works when the site is served from the domain root. On GitHub
// Pages (project site) the app lives under "/<repo>/", so a bare "/assets/x"
// would 404. This prepends import.meta.env.BASE_URL so the path resolves no
// matter what subdirectory the build is served from.
//
// Idempotent and safe to call on already-resolved, external, or empty values.
const BASE = import.meta.env.BASE_URL; // "./" (build) or "/" (dev)

export function asset(p) {
  if (!p) return p;
  // Leave external URLs, data/blob URLs, and already-relative paths untouched.
  if (/^(https?:|data:|blob:|\.)/.test(p)) return p;
  return BASE.replace(/\/$/, "") + "/" + String(p).replace(/^\/+/, "");
}
