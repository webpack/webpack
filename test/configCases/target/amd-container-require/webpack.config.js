const webpack = require("../../../../");
/** @type {import("../../../../types").Configuration} */
module.exports = {
	output: {
		library: {
			type: "amd-require",
			amdContainer: "window['clientContainer']"
		}
	},
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"var nodeRequire = require;\nvar require = function(deps, fn) { fn(); }\nconst window = {};\nwindow['clientContainer'] = { require };\n"
		})
	]
};
