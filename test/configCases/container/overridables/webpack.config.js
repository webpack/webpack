const { OverridablesPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new OverridablesPlugin([
			{
				test1: "./modules/test1.js",
				test2: "./modules/test2",
				test3: "./modules/test3"
			},
			{
				test1: "./cjs/test1",
				test2: "./cjs/test2.js",
				test3: "./cjs/../cjs/test3.js",
				nested1: ["./options/test2"],
				nested2: {
					deep: {
						deep: "./options/test3"
					}
				}
			},
			"package",
			"././options/test1",
			"./splitChunks/app"
		])
	],
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendorTest: {
					test: /splitChunks.vendor/,
					enforce: true
				},
				sharedTest: {
					test: /splitChunks.shared-separate/,
					enforce: true
				}
			}
		}
	}
};
