const webpack = require("../../../../");
module.exports = {
	output: {
		library: "named-system-module",
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
					register: function(name, deps, fn) {
						function dynamicExport() {}
						var mod = fn(dynamicExport);
						mod.execute();
					}
				}
			`
		})
	]
};
