var path = require("path");
var webpack = require("../../../../");

module.exports = {
	entry: {
		bundle0: ["./"]
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(__dirname, '../../../js/config/plugins/dll-plugin/[name]-manifest.json'),
			name: "[name]_[hash]"
		})
	]
}
