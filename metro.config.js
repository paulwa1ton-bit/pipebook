const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Metro's "package exports" resolution causes the Firebase JS SDK to load
// two separate copies of @firebase/app's component registry (one via the
// top-level `firebase` package, one via its internally bundled
// @firebase/auth) - so `initializeAuth`/`getAuth` register and look up the
// "auth" component on different instances, throwing "Component auth has
// not been registered yet". Disabling package-exports resolution makes
// Metro fall back to Firebase's "main" field, which resolves consistently.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
