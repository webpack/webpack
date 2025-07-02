"use strict";

module.exports = {
	// mode: "development" || "production",
	target: "node",
	output: {
		// We strong recommend use `publicPath: 'auto'` or do not set `publicPath` at all to generate relative URLs
		// publicPath: 'auto'
	},
	module: {
		rules: [
			{
				test: /\.node$/,
				type: "asset/resource"
			}
		]
	}
};
