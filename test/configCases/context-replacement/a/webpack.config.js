var path = require("path");
var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(/context-replacement.a$/, path.join(__dirname, "new-context"), true, /^replaced$/)
	]
};