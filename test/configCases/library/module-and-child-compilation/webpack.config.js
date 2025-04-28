/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	module: {
		strictExportPresence: true,
		rules: [
			{
				test: /\.custom$/i,
				loader: require.resolve("./loader")
			}
		]
	},
	experiments: {
		outputModule: true
	}
};
