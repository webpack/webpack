/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		alias: {
			"./wrong2": "./ok2"
		}
	},
	module: {
		rules: [
			{
				test: require.resolve("./a"),
				resolve: {
					alias: {
						"./wrong": "./ok"
					},
					extensions: [".js", ".ok.js"]
				}
			},
			{
				test: require.resolve("./b"),
				resolve: {
					alias: {
						"./wrong": "./ok"
					},
					extensions: ["...", ".ok.js"]
				}
			},
			{
				test: require.resolve("./b"),
				resolve: {
					extensions: [".yes.js", "..."]
				}
			}
		]
	}
};
