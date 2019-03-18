const webpack = require("../../../../");
module.exports = {
	output: {
		libraryTarget: "system"
	},
	externals: {
		external1: "external1",
		external2: "external2"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner: `
				System = {
					register: function(deps, fn) {
						function dynamicExport() {}
						var mod = fn(dynamicExport);
						deps.forEach((dep, i) => {
							mod.setters[i](System.registry[dep]);
						})
						mod.execute();
					},
					registry: {
						external1: 'the external1 value',
						external2: 'the external2 value',
					},
				}
			`
		})
	]
};
