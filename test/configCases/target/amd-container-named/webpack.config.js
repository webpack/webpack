const webpack = require("../../../../");
/** @type {import("../../../../types").Configuration} */
module.exports = {
	output: {
		library: {
			type: "amd",
			name: "clientContainer",
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
				"function define(name, deps, fn) { fn(); }\nconst window = {};\nwindow['clientContainer'] = { define };\n"
		})
	]
};
