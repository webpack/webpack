"use strict";

const { ProvidePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
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
