/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				resource: /abc\.js$/,
				use: [
					{
						loader: "./loader",
						options: "a"
					},
					{
						loader: "./loader",
						options: "b"
					}
				]
			},
			{
				resource: /def\.js$/,
				use: [
					{
						loader: "./loader",
						options: "c"
					},
					{
						loader: "./loader",
						options: "d"
					}
				]
			}
		]
	}
};
