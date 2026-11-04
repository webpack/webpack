"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				mimetype: "application/octet-stream",
				type: "asset/resource"
			},
			{
				mimetype: "application/octet-stream+inline",
				type: "asset/inline"
			},
			{
				mimetype: "application/octet-stream+base64",
				type: "asset/inline",
				generator: {
					dataUrl: { encoding: "base64" }
				}
			},
			{
				test: /\.(png|svg)$/,
				type: "asset/inline"
			},
			{
				mimetype: "image/svg+xml",
				type: "asset/inline"
			},
			{
				test: /\.jpg$/,
				type: "asset",
				parser: {
					dataUrlCondition: {
						maxSize: Infinity
					}
				}
			},
			{
				mimetype: "text/plain",
				type: "asset/inline",
				loader: "./loader"
			}
		]
	}
};
