const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	infrastructureLogging: {
		level: "verbose"
	},
	cache: {
		type: "filesystem",
		// changing the cacheDirectory is optional,
		// by default it will be in `node_modules/.cache`
		cacheDirectory: path.resolve(__dirname, ".cache")
	}
});
