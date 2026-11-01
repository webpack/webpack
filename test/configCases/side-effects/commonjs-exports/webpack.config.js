"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /commonjs-disabled/,
				parser: { commonjs: false }
			}
		]
	},
	optimization: {
		// keeps every module a table entry, so presence is what is asserted
		concatenateModules: false,
		moduleIds: "named"
	}
};
