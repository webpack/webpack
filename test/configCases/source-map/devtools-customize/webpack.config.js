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
			type: "all",
			use: "source-map"
		}
	],
	plugins: [
		{
			apply(compiler) {
				// TODO webpack6 - we will remove compatibility logic
				expect(compiler.options.devtool).toBe("source-map");

				compiler.options.devtool = false;
				expect(compiler.options.devtool).toBe(false);

				compiler.options.devtool = [];
				expect(compiler.options.devtool).toBe(false);

				delete compiler.options.devtool;
				expect(compiler.options.devtool).toBeUndefined();

				Object.defineProperty(compiler.options, "devtool", {
					value: [{ type: "javascript", use: "eval" }]
				});
				expect(compiler.options.devtool).toBe("eval");
				const desc = Object.getOwnPropertyDescriptor(
					compiler.options,
					"devtool"
				);
				if (desc) expect(desc.value).toBe("eval");

				compiler.options.devtool = [
					{
						type: "css",
						use: "hidden-nosources-cheap-source-map"
					},
					{
						type: "javascript",
						use: "source-map"
					}
				];
				expect(compiler.options.devtool).toBe("source-map");
			}
		}
	]
};
