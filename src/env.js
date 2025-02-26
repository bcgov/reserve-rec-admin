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
  window.__env.ADMIN_USER_POOL_ID = "ca-central-1_nXF7h0SwT";
  window.__env.ADMIN_USER_POOL_CLIENT_ID = "7ui3kd8505rkv1duknj57en10o";
  window.__env.ADMIN_IDENTITY_POOL_ID = "ca-central-1:3d6679c6-21c1-44fd-91f5-c1217a117560";
  window.__env.OAUTH_DOMAIN = "reserve-rec-dev.auth.ca-central-1.amazoncognito.com";
  window.__env.WEBSOCKET_URL = "wss://id7kh3hg1d.execute-api.ca-central-1.amazonaws.com/api/";

  // Add any feature-toggles
  // window.__env.coolFeatureActive = false;
})(this);
