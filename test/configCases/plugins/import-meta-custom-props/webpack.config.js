"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			"import.meta.custom": JSON.stringify("custom-value"),
			"import.meta.build.time": JSON.stringify("now")
		})
	]
};
