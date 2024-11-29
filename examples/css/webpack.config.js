const MfStartupChunkDependenciesPlugin = require('./path/to/MfStartupChunkDependenciesPlugin'); // Update with the correct path

module.exports = {
  output: {
    uniqueName: "app"
  },
  experiments: {
    css: true
  },
  plugins: [
    new MfStartupChunkDependenciesPlugin(), // Add this line to use the plugin
  ],
};
