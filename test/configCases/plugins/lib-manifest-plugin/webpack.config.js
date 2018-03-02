var path = require("path");
var LibManifestPlugin = require("../../../../lib/LibManifestPlugin");

module.exports = {
	entry: {
		bundle0: ["./"]
	},
	plugins: [
		new LibManifestPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/plugins/lib-manifest-plugin/[name]-manifest.json"
			),
			name: "[name]_[hash]"
		})
	],
	node: {
		__dirname: false
	}
};
