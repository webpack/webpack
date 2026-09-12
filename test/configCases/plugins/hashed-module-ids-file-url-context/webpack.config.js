"use strict";

const { pathToFileURL } = require("url");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		// Only the plugin may assign ids, so the context it hashes is observable
		moduleIds: false
	},
	plugins: [
		new webpack.ids.HashedModuleIdsPlugin({
			context: pathToFileURL(__dirname).href
		})
	]
};
