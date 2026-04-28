"use strict";

const path = require("path");

/**
 * @param {string} exportType the CSS parser exportType under test
 * @param {boolean} useLess whether to compile through less-loader
 * @returns {import("../../../../").Configuration} webpack configuration
 */
const makeConfig = (exportType, useLess) => {
	const sourceFile = useLess ? "style.less" : "style.css";
	return {
		name: `${exportType}${useLess ? "-less" : ""}`,
		target: "web",
		mode: "development",
		devtool: "source-map",
		resolve: {
			alias: {
				STYLE_UNDER_TEST$: path.resolve(__dirname, sourceFile)
			}
		},
		module: {
			rules: [
				useLess
					? {
							test: /\.less$/,
							use: [
								{
									loader: "less-loader",
									options: { sourceMap: true }
								}
							],
							type: "css/auto",
							...(exportType !== "link" && { parser: { exportType } })
						}
					: {
							test: /\.css$/,
							type: "css/auto",
							...(exportType !== "link" && { parser: { exportType } })
						}
			]
		},
		experiments: {
			css: true
		}
	};
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	makeConfig("link", false),
	makeConfig("text", false),
	makeConfig("style", false),
	makeConfig("css-style-sheet", false),
	makeConfig("link", true),
	makeConfig("text", true),
	makeConfig("style", true),
	makeConfig("css-style-sheet", true)
];
