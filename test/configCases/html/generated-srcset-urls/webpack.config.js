"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((minimize) => ({
	target: "node",
	devtool: false,
	experiments: { html: true },
	optimization: { minimize },
	output: { publicPath: "" },
	resolve: { alias: { ignored: false } },
	externals: {
		webpack: "commonjs webpack",
		encoded: "asset /already%20encoded.svg",
		whitespace: "asset /a\tb\nc\fd\re f.svg",
		unicode: "asset /a\u00A0b.svg",
		"data-image": "asset data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
		"data-comma": "asset data:text/plain,value,"
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset/resource",
				oneOf: [
					{ resourceQuery: /space/, generator: { filename: "my image.svg" } },
					{ resourceQuery: /trailing/, generator: { filename: "asset,," } },
					{ resourceQuery: /leading/, generator: { filename: ",,image.svg" } },
					{
						resourceQuery: /interior/,
						generator: { filename: "wide,tall.svg" }
					}
				]
			}
		]
	}
}));
