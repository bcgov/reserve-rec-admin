(function (window) {
  window.__env = window.__env || {};

  window.__env.logLevel = 0; // All

  // Get config from remote host?
  window.__env.configEndpoint = false;

  // Environment name
  window.__env.ENVIRONMENT = "local"; // local | dev | test | prod

  window.__env.API_LOCATION = "http://localhost:3000/";
  window.__env.API_PATH = "api";
  window.__env.GH_HASH = "local-build";
  window.__env.ADMIN_USER_POOL_ID = "ca-central-1_0IL8TJWGj";
  window.__env.ADMIN_USER_POOL_CLIENT_ID = "7obkog695s1ka43ojb3r345sr";
  window.__env.ADMIN_IDENTITY_POOL_ID = "ca-central-1:d1f995d3-f614-406d-9022-2dff31c60975";
  window.__env.ADMIN_USER_POOL_DOMAIN_URL = "reserve-rec-admin-identity-dev.auth.ca-central-1.amazoncognito.com";
  window.__env.CONFIG_URL = null; // If null, will defer to host url. If defined, will look for config at this url.
  // window.__env.WEBSOCKET_URL = "wss://id7kh3hg1d.execute-api.ca-central-1.amazonaws.com/api/";

  // Add any feature-toggles
  // window.__env.coolFeatureActive = false;
})(this);
