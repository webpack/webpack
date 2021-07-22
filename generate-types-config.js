module.exports = {
	nameMapping: {
		FsStats: /^Stats Import fs/,
		validateFunction: /^validate Import/,
		Configuration: /^WebpackOptions /
	},
	exclude: [/^devServer in WebpackOptions /],
	include: [/^(_module|_compilation|_compiler) in NormalModuleLoaderContext /]
};
