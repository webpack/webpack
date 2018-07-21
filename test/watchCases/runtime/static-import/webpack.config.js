var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");
module.exports = {
    output: {
        filename: "[name].bundle.js",
        chunkFilename: "[name].[chunkhash].js"
    },
    target: "web",
	plugins: [
        new CommonsChunkPlugin({
            name: ["manifest"],
            minChunks: Infinity
        })
	]
};
