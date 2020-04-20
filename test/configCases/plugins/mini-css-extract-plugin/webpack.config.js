var MCEP = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b",
		c: "./c.css"
	},
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MCEP.loader, "css-loader"]
			}
		]
	},
	target: "web",
	node: {
		__dirname: false
	},
	plugins: [new MCEP()]
};
