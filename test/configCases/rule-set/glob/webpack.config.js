"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: { glob: "files/**/*.js" },
				oneOf: [
					{
						test: { glob: "**/vendor/**" },
						use: "./loader?vendor"
					},
					{
						include: { glob: "**/deep/*.js" },
						use: "./loader?deep"
					},
					{
						exclude: { glob: ["**/vendor/**", "**/deep/**"] },
						use: "./loader?rest"
					}
				]
			},
			{
				// built with `path.resolve`, so `\` on Windows and `/` elsewhere
				test: { glob: path.resolve(__dirname, "absolute/*.{js,mjs}") },
				use: "./loader?absolute"
			}
		]
	}
};
