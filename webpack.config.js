const path = require("path");
const StrictModeWarningPlugin = require("./StrictModeWarningPlugin");


module.exports = {
  mode: "development", // Change to 'production' for optimized builds
  entry: "./src/index.js", // Define the entry file
  output: {
    filename: "bundle.js", // Name of the bundled file
    path: path.resolve(__dirname, "dist"), // Output directory
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader", // Transpile JS (optional)
        },
      },
    ],
  },
  plugins: [
    new StrictModeWarningPlugin(),
  ],
};
