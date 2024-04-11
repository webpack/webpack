/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.css/,
				parser: {
					namedExports: false
				},
				type: "css/module"
			}
		]
	},
	experiments: {
		css: true
	}
};
