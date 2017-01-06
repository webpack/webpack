var webpack = require("../../../../");
var path = require("path");

module.exports = {
	plugins: [
		new webpack.WatchIgnorePlugin([/file\.js$/, /foo$/])
	]
};
