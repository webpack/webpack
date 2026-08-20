"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				glob: ["**/files/**/*.js", "!**/*.test.js", "!**/vendor/**"],
				use: "./loader?glob"
			},
			{
				// every condition on a rule has to match, `glob` included
				glob: "**/files/**/*.js",
				test: /\.test\.js$/,
				use: "./loader?combined"
			},
			{
				test: /\.js$/,
				include: { glob: "**/files/vendor/**" },
				glob: "!**/skip.js",
				use: "./loader?vendor"
			}
		]
	}
};
