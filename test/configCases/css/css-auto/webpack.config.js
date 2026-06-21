"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
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
	}
};
