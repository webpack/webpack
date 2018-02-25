var webpack = require("../../../../");
module.exports = [
	{
		name: "hash with length in publicPath",
		output: {
			publicPath: "/[hash:6]/",
			filename: "bundle0.[hash:6].js",
			chunkFilename: "[id].bundle0.[hash:6].js"
		},
		amd: {
			expectedFilenameLength: 17,
			expectedChunkFilenameLength: 19
		}
	},
	{
		name: "hash in publicPath",
		output: {
			publicPath: "/[hash]/",
			filename: "bundle1.[hash].js",
			chunkFilename: "[id].bundle1.[hash].js"
		},
		amd: {
			expectedFilenameLength: 31,
			expectedChunkFilenameLength: 33
		}
	},
	{
		name: "chunkhash with length",
		output: {
			filename: "bundle2.[chunkhash:8].js",
			chunkFilename: "[id].bundle2.[chunkhash:8].js"
		},
		amd: {
			expectedFilenameLength: 19,
			expectedChunkFilenameLength: 21
		}
	},
	{
		name: "chunkhash",
		output: {
			filename: "bundle3.[chunkhash].js",
			chunkFilename: "[id].bundle3.[chunkhash].js"
		},
		amd: {
			expectedFilenameLength: 31,
			expectedChunkFilenameLength: 33
		}
	},
	{
		name: "hash with and without length",
		output: {
			filename: "bundle4.[hash].js",
			chunkFilename: "[id].bundle4.[hash:8].js"
		},
		amd: {
			expectedFilenameLength: 31,
			expectedChunkFilenameLength: 21
		}
	},
	{
		name: "hash with length",
		output: {
			filename: "bundle5.[hash:6].js",
			chunkFilename: "[id].bundle5.[hash:8].js"
		},
		amd: {
			expectedFilenameLength: 17,
			expectedChunkFilenameLength: 21
		}
	},
	{
		name: "chunkhash in chunkFilename ",
		output: {
			filename: "bundle6.[hash].js",
			chunkFilename: "[id].bundle6.[chunkhash:7].js"
		},
		amd: {
			expectedFilenameLength: 31,
			expectedChunkFilenameLength: 20
		},
		plugins: [new webpack.HotModuleReplacementPlugin()]
	},
	{
		name: "hash with length and chunkhash with length",
		output: {
			filename: "bundle7.[hash:7].js",
			chunkFilename: "[id].bundle7.[chunkhash:7].js"
		},
		target: "node",
		amd: {
			expectedFilenameLength: 18,
			expectedChunkFilenameLength: 20
		}
	},
	{
		name: "hash with length in chunkFilename",
		output: {
			filename: "bundle8.[hash].js",
			chunkFilename: "[id].bundle8.[hash:7].js"
		},
		target: "node",
		amd: {
			expectedFilenameLength: 31,
			expectedChunkFilenameLength: 20
		}
	},
	{
		name: "chunkhash with length in chunkFilename",
		output: {
			filename: "bundle9.[hash].js",
			chunkFilename: "[id].bundle9.[chunkhash:7].js"
		},
		target: "node",
		amd: {
			expectedFilenameLength: 31,
			expectedChunkFilenameLength: 20
		}
	}
];

module.exports.forEach(function(options) {
	options.plugins = options.plugins || [];
	options.plugins.push(
		new webpack.DefinePlugin({
			NAME: JSON.stringify(options.name)
		})
	);
});
