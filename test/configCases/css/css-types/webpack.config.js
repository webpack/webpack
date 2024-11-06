/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "css"
			},
			{
				test: /\.local\.css$/i,
				type: "css/module"
			},
			{
				test: /\.global\.css$/i,
				type: "css/global"
			},
			{
				test: /\.auto\.css$/i,
				type: "css/auto"
			},
			{
				test: /\.modules\.css$/i,
				type: "css/auto"
			}
		]
	},
	experiments: {
		css: true
	}
};
