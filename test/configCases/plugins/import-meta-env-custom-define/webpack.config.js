"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			"import.meta.env": "globalThis.CUSTOM_META_ENV",
			"import.meta.env.B": JSON.stringify("b")
		})
	]
};
