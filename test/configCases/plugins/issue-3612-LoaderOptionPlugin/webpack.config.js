const webpack = require('webpack');

module.exports = {
	module: {
		rules: [
			{
				test: /\.css$/,
				loaders: ["css-loader", "any-loader"]
			}
		]
	},
	plugins: [
		new webpack.LoaderOptionsPlugin({
			options: {
				any: "body { display: flex;}"
			}
		})
	],
};
