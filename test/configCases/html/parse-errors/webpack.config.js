"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				parseErrors: true
			}
		},
		rules: [
			{
				test: /quiet\.html$/,
				parser: {
					parseErrors: false
				}
			}
		]
	},
	experiments: { html: true }
};
