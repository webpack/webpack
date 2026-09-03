"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				// the issuer's rule-level resolve options must reach the context's children on every build
				test: /context\.js$/,
				resolve: {
					alias: {
						"./a.js": "./a-alt.js"
					}
				}
			}
		]
	}
};
