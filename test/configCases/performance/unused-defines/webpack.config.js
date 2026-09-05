"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	plugins: [
		new DefinePlugin({
			USED_FLAG: JSON.stringify(true),
			UNUSED_FLAG: JSON.stringify(false),
			// A nested object is reported per leaf, so the used sibling stays quiet.
			NESTED: {
				INNER: JSON.stringify("inner"),
				NEVER: JSON.stringify("never")
			},
			"typeof TYPEOF_USED": JSON.stringify("string"),
			"typeof TYPEOF_UNUSED": JSON.stringify("string")
		})
	]
};
