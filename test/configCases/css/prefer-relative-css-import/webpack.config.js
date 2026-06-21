"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.less$/,
				// Use the CJS less; less-loader's default `import("less")` crashes Bun's vm.
				use: [
					{
						loader: "less-loader",
						options: { implementation: require("less") }
					}
				],
				type: "css/auto"
			}
		]
	},
	experiments: {
		css: true
	}
};
