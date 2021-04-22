module.exports = {
	nameMapping: {
		FsStats: /^Stats Import fs/,
		Configuration: /^WebpackOptions /
	},
	exclude: [/^devServer in WebpackOptions /],
	include: [/^(_module|_compilation|_compiler) in NormalModuleLoaderContext /]
};
