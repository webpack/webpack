"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /object-path\.js$/,
				parser: { soaAst: false }
			}
		]
	}
};
