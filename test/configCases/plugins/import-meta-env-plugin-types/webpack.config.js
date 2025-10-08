"use strict";

const { ImportMetaEnvPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	plugins: [
		new ImportMetaEnvPlugin({
			STRING_VAR: "string value",
			NUMBER_VAR: 42,
			BOOLEAN_TRUE: true,
			BOOLEAN_FALSE: false,
			ZERO: 0,
			EMPTY_STRING: "",
			DECIMAL: 3.14
		})
	],
	optimization: {
		minimize: false
	}
};
