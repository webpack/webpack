const webpack = require("../../../../");
module.exports = {
	output: {
		libraryTarget: "system"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner: `
				System = {
					register: function(deps, fn) {
						function dynamicExport() {}

						var mod = fn(dynamicExport)
						mod.execute()
					}
				}
			`
		})
	]
};
