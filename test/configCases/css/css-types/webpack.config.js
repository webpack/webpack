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
			}
		]
	},
	experiments: {
		css: true
	}
};
