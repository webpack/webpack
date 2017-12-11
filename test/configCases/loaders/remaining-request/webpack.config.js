module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: [
					"./loader1",
					{
						loader: "./loader2",
						ident: "loader2",
						options: {
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
