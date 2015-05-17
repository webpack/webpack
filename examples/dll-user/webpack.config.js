var path = require("path");
var DllReferencePlugin = require("../../lib/DllReferencePlugin");
module.exports = {
	plugins: [
		new DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/js/alpha-manifest.json")
		}),
/*		new DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/js/beta-manifest.json")
		})
*/	]
};
