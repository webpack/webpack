var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new webpack.WatchIgnorePlugin({ paths: [/file\.js$/, /foo$/] })]
};
