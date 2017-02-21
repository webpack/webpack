module.exports = {
	resolveLoader: {
		alias: {
			"some-loader": "any-loader?foo=someMessage"
		}
	},
	bail: true,
	module: {
		rules: [{
			test: /a\.js$/,
			loader: "some-loader",
		}, {
			test: /b\.json$/,
			loader: "json-loader",
		}, {
			test: /c\.js$/,
			use: [{
				loader: "any-loader",
				options: {
					foo: "someMessage",
				},
			}],
		}],
	},
};
