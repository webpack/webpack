/** @type {import("../../../../").Configuration} */
module.exports = {
	resolveLoader: {
		alias: {
			"some-loader": "any-loader?foo=someMessage"
		}
	},
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: [
					{
						loader: "some-loader"
					}
				]
			},
			{
				test: /b\.js$/,
				use: [
					{
						loader: "some-loader",
						options: {
							foo: "someOtherMessage"
						}
					}
				]
			},
			{
				test: /b2\.js$/,
				loader: "some-loader",
				options: "foo=someOtherMessage"
			},
			{
				test: /b3\.js$/,
				use: [
					{
						loader: "some-loader",
						options: "foo=someOtherMessage"
					}
				]
			}
		]
	}
};
