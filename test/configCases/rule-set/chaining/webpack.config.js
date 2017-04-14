module.exports = {
	module: {
		rules: [
			{
				resource: /abc\.js$/,
				loader: "./loader?a!./loader?b"
			},
			{
				resource: /def\.js$/,
				loaders: "./loader?c!./loader?d"
			}
		]
	}
};
