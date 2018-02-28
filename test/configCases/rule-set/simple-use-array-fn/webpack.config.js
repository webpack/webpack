module.exports = {
	module: {
		rules: [
			{
				oneOf: [
					{
						test: {
							and: [/a.\.js$/, /b\.js$/]
						},
						loader: "./loader?first"
					},
					{
						test: [require.resolve("./a"), require.resolve("./c")],
						issuer: require.resolve("./b"),
						use: data => [
							"./loader?second-1",
							{
								loader: "./loader",
								options: "second-2"
							},
							{
								loader: "./loader",
								options: {
									get: function() {
										return "second-3";
									}
								}
							}
						]
					},
					{
						test: {
							or: [require.resolve("./a"), require.resolve("./c")]
						},
						loader: "./loader",
						options: "third"
					}
				]
			}
		]
	}
};
