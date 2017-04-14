module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: [
					"./loader1",
					{
						loader: "./loader2",
						options: {
							ident: "loader2",
							f: function() {
								return "ok";
							}
						}
					}
				]
			}
		]
	}
};
