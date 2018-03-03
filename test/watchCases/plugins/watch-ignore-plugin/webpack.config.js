var webpack = require("../../../../");

module.exports = {
	plugins: [new webpack.WatchIgnorePlugin([/file\.js$/, /foo$/])]
};
