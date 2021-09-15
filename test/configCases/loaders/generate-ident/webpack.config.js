/** @type {import("../../../../").Configuration} */
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
							f: function () {
								return "ok";
							}
						}
					}
				]
			},
			{
				test: /(b|c)\.js$/,
				use: ["./loader1"]
			},
			{
				test: /b\.js$/,
				use: {
					loader: "./loader2",
					options: {
						f: function () {
							return "maybe";
						}
					}
				}
			},
			{
				test: /c\.js$/,
				use: {
					loader: "./loader2",
					options: {
						f: function () {
							return "yes";
						}
					}
				}
			},
			{
				test: /d\.js$/,
				use: [
					"./loader1",
					"./loader1",
					"./loader1",
					{
						loader: "./loader2",
						options: {
							f: function () {
								return "ok";
							}
						}
					}
				]
			}
		]
	}
};
