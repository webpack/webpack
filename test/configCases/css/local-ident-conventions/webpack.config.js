"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	node: { __dirname: false, __filename: false },
	experiments: { css: true },
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				oneOf: [
					{
						resourceQuery: /camel/,
						generator: {
							localIdentName: "camel-[local]",
							exportsConvention: "camel-case-only"
						}
					},
					{
						resourceQuery: /dashes/,
						generator: {
							localIdentName: "dashes-[local]",
							exportsConvention: "dashes-only"
						}
					}
				]
			}
		]
	}
};
