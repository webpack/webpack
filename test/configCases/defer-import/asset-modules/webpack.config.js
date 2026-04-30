"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	module: {
		rules: [
			{
				test: /\.svg$/,
				oneOf: [
					{ resourceQuery: /inline/, type: "asset/inline" },
					{ type: "asset/resource" }
				]
			}
		]
	},
	output: {
		assetModuleFilename: "[hash][ext]"
	},
	experiments: {
		deferImport: true
	}
};
