module.exports = {
	module: {
		rules: [
			{
				test: require.resolve("./a"),
				resolve: {
					alias: {
						"./wrong": "./ok"
					}
				}
			}
		]
	}
};
