/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "css/auto",
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
