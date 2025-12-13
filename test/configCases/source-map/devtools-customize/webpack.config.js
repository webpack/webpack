"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	experiments: {
		css: true,
		outputModule: true
	},
	devtool: [
		{
			type: "css",
			use: "hidden-nosources-cheap-source-map"
		},
		{
			type: "javascript",
			use: "source-map"
		}
	],
	plugins: [
		{
			apply(compiler) {
				// TODO webpack6 - we will remove compatibility logic
				expect(compiler.options.devtool).toBe("source-map");
			}
		}
	]
};
