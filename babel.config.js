module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: { "@": "./" },
          extensions: [".ios.js", ".android.js", ".js", ".jsx", ".ts", ".tsx", ".json"],
        },
      ],
      // Reanimated 4 moved the worklets transform into its own package.
      // Must run last.
      "react-native-worklets/plugin",
    ],
  };
};
