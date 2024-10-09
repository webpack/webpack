/** @type {function(any, any): import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.my-css$/i,
				type: "css/auto"
			},
			{
				test: /\.invalid$/i,
				type: "css/auto"
			}
		]
	},
	node: {
		__dirname: false,
		__filename: false
	}
});
