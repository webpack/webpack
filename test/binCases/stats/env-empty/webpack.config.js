var path = require("path");

module.exports = {
	entry: path.resolve(__dirname, "./index"),
	stats: {
		env: true,
		assets: true,
		colors: true,
		chunks: true,
		maxModules: 0
	}
};
