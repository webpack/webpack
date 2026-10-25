"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		parser: {
			css: {
				parseErrors: true
			}
		},
		rules: [
			{
				test: /quiet\.css$/,
				parser: {
					parseErrors: false
				}
			}
		]
	}
};
