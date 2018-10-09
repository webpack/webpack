const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	cache: {
		type: "filesystem",
		name: env,
		cacheDirectory: path.resolve(__dirname, ".cache"),
		warn: true
	}
});
