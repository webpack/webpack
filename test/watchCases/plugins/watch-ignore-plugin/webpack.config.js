var webpack = require("../../../../");

module.exports = {
	plugins: [new webpack.WatchIgnorePlugin({ paths: [/file\.js$/, /foo$/] })]
};
