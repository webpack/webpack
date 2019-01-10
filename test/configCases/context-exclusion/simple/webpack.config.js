var webpack = require("../../../../");

module.exports = {
	plugins: [new webpack.ContextExclusionPlugin(/dont/)]
};
