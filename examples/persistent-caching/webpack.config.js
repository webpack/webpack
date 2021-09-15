const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	infrastructureLogging: {
		// Optional: print more verbose logging about caching
		level: "verbose"
	},
	cache: {
		type: "filesystem",

		// changing the cacheDirectory is optional,
		// by default it will be in `node_modules/.cache`
		cacheDirectory: path.resolve(__dirname, ".cache"),

		// Add additional dependencies to the build
		buildDependencies: {
			// recommended to invalidate cache on config changes
			// This also makes all dependencies of this file build dependencies
			config: [__filename]
			// By default webpack and loaders are build dependencies
		}
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"]
			}
		]
	}
});
