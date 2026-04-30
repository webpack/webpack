"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		environment: {
			module: false,
			const: false,
			arrowFunction: false,
			bigIntLiteral: false,
			destructuring: false,
			dynamicImport: false,
			forOf: false
		}
	},
	module: {
		parser: {
			"javascript/auto": {
				anonymousDefaultExportName: true
			}
		}
	}
};
