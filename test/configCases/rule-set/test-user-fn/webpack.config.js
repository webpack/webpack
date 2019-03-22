module.exports = {
	module: {
		rules: [
			{
				test: /\.css$/,
				// use: [{loader: 'style-loader'}, {loader: 'css-loader', options: {url: true}}],
				use: info => {
					console.log(info);

					return [
						{
							loader: "style-loader"
						},
						{
							loader: "css-loader",
							options: {
								url: true
							}
						}
					];
				}
			}
		]
	}
};
