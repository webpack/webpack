const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	cache: {
		type: "filesystem",
		cacheDirectory: path.resolve(__dirname, ".cache"),
		loglevel: "warning"
	}
});
