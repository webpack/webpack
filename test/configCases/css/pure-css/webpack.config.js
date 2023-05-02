/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "css/global",
				resolve: {
					fullySpecified: true,
					preferRelative: true
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
