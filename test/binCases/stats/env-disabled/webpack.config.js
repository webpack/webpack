var path = require("path");

module.exports = {
	entry: path.resolve(__dirname, "./index"),
	stats: {
		env: false,
		assets: true,
		colors: true,
		chunks: true,
		maxModules: 0
	}
};
