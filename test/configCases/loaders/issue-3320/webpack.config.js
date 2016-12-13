module.exports = {
	resolveLoader: {
		alias: {
			"any-loader": 'any-loader?foo="someMessage"'
		}
	},
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: [
					{
						loader: "any-loader"
					}
				]
			},
			{
				test: /b\.js$/,
				use: [
					{
						loader: 'any-loader?foo="someOtherMessage"'
					}
				]
			}
		]
	}
}
