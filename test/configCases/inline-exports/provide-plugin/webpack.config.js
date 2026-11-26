"use strict";

const { ProvidePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		moduleIds: "named",
		inlineExports: true
	},
	plugins: [
		new ProvidePlugin({
			value: ["./provide.js", "value"]
		})
	]
};
