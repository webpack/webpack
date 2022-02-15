/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.my$/,
				loader: "regexp-#-loader"
			}
		]
	}
};
