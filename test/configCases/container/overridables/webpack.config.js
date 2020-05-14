const { OverridablesPlugin, scope } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new OverridablesPlugin({
			overridables: [
				{
					test1: ["./modules/test1.js", "./cjs/test1"],
					test2: "./modules/test2",
					test3: {
						import: "./modules/test3"
					}
				},
				{
					test2: "./cjs/test2.js",
					test3: "./cjs/../cjs/test3.js",
					...scope("nested1", ["./options/test2"]),
					...scope("nested2", {
						...scope("deep", {
							deep: "./options/test3"
						})
					})
				},
				"package",
				"././options/test1",
				"./splitChunks/app"
			]
		})
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
