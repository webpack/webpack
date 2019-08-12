const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	infrastructureLogging: {
		level: "verbose"
	},
	cache: {
		type: "filesystem",
		cacheDirectory: path.resolve(__dirname, ".cache")
	}
});
