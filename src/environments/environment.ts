export const environment = {
  production: false,
  apiUrl: 'http://localhost:9090/arkivy/v1.0',
  // Shows the "Modo desarrollo (sin Zitadel)" button on /login. Only works if
  // the backend also has DEV_AUTH_BYPASS=true (see arkivy-api/.env) — this
  // flag alone does nothing against a real backend.
  devAuthBypass: true,
};
