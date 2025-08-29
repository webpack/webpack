"use strict";

module.exports = {
	mode: "development",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.js$/i,
				extractSourceMap: true
			}
		]
	},
};
