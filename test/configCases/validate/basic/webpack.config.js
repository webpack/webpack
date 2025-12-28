"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	entry: "./test.js",
	plugins: [
		new IgnorePlugin(
			/** @type {import("../../../../lib/IgnorePlugin").IgnorePluginOptions} */ (
				{
					// Invalid: missing required resourceRegExp or checkResource
				}
			)
		)
	]
};
