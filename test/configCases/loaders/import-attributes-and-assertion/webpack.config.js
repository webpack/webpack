/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				assert: { type: "json" },
				loader: require.resolve("./loader-assert.js")
			},
			{
				with: { type: "json" },
				loader: require.resolve("./loader-with.js")
			}
		]
	}
};
