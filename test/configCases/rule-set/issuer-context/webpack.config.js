"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// named ids read the library identifier, which has to stay unique per issuer too
	optimization: {
		moduleIds: "named"
	},
	module: {
		rules: [
			{
				rules: [
					{
						test: /\.txt$/,
						issuer: /a\.js$/,
						loader: "./loader",
						options: { tag: "A" }
					}
				]
			},
			{
				oneOf: [
					{
						test: /\.txt$/,
						issuer: /b\.js$/,
						loader: "./loader",
						options: { tag: "B" }
					},
					{
						test: /\.txt$/,
						issuer: /c\.js$/,
						loader: "./loader",
						options: { tag: "C" }
					},
					{
						test: /\.txt$/,
						issuer: /d\.js$/,
						loader: "./loader",
						options: { tag: "D" }
					},
					{
						test: /\.txt$/,
						issuer: /e\.js$/,
						loader: "./loader",
						options: { tag: "E" }
					}
				]
			}
		]
	}
};
