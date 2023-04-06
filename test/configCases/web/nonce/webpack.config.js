const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	// plugin that intercepts __webpack_require__
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
