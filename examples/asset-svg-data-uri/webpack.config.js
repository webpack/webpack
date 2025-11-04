"use strict";

const svgToMiniDataURI = require("mini-svg-data-uri");

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg)$/,
				type: "asset"
			},
			{
				test: /\.svg$/,
				type: "asset",
				generator: {
					/**
					 * @param {string | Buffer} content the content
					 * @returns {string} data URI
					 */
					dataUrl: (content) => {
						if (typeof content !== "string") {
							content = content.toString();
						}

						return svgToMiniDataURI(content);
					}
				}
			}
		]
	}
};

module.exports = config;
