"use strict";

const ManifestPlugin = require("../../../../lib/ManifestPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ManifestPlugin({
			entrypoints: false
		})
	]
};
