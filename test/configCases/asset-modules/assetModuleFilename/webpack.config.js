/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: ({ filename }) => {
			if (/.png$/.test(filename)) {
				return "images/[\\ext\\]/success-png[ext]";
			}
			if (/.svg$/.test(filename)) {
				return "images/success-svg[ext]";
			}
			return "images/failure[ext]";
		}
	},
	module: {
		rules: [
			{
				test: /\.(png|svg)$/,
				type: "asset/resource",
				rules: [
					{
						resourceQuery: "?custom2",
						generator: {
							// TODO webpack 6: remove generator.filename
							filename: "custom-images/success[ext]"
						}
					},
					{
						resourceQuery: "?custom3",
						parser: {
							filename: "images/custom/success[ext]"
						}
					}
				]
			}
		]
	}
};
