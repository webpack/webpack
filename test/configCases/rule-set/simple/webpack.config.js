module.exports = {
	module: {
		rules: [
			{ oneOf: [
				{
					test: require.resolve("./ab"),
					loader: "./loader?first"
				},
				{
					test: require.resolve("./a"),
					issuer: require.resolve("./b"),
					use: [
						"./loader?second-1",
						{
							loader: "./loader",
							options: "second-2"
						},
						{
							loader: "./loader",
							options: {
								get: function() { return "second-3"; }
							}
						}
					]
				},
				{
					test: require.resolve("./a"),
					loader: "./loader",
					options: "third"
				}
			]}
		]
	}
}