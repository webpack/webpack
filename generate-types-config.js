module.exports = {
	nameMapping: {
		FsStats: /^Stats Import fs/,
		Configuration: /^WebpackOptions /
	},
	exclude: [/^devServer in WebpackOptions /]
};
