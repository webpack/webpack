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
				global.SystemExports = {
					'export': function(exports) {
						Object.assign(global.SystemExports, exports);
					}
				};
				global.System = {
					register: function(deps, fn) {
						var mod = fn(global.SystemExports['export']);
						mod.execute();
					}
				};
			`
		})
	]
};
