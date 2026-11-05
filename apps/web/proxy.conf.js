// Decision 7: same-origin in dev. The frontend uses relative /api URLs, so no CORS
// config exists anywhere and no API base URL needs to vary by environment.
//
// A .js config (was proxy.conf.json) so the target port follows PORT in .env.local.
// Two worktrees running side by side each point at their own API.
const { readDevEnv } = require('./dev-env.cjs');

const { apiPort } = readDevEnv();

module.exports = {
  '/api': {
    target: `http://localhost:${apiPort}`,
    secure: false,
    changeOrigin: false,
    // Carries Socket.io too: the gateway path is /api/socket.io (see
    // NotificationSocketAuth in packages/shared), so no second rule is needed.
    // The default /socket.io path would NOT match this rule (Trap #10).
    ws: true,
  },
};
