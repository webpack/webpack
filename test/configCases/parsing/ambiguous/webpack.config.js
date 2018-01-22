const webpack = require("../../../../");

module.exports = {
	plugins: [new webpack.WarnAmbiguousSourceTypePlugin()]
};
