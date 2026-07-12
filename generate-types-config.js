const config = {
	nameMapping: {
		FsStats: /^Stats Import fs/,
		validateFunction: /^validate Import/,
		Configuration: /^WebpackOptions /,
		MultiConfiguration: /^MultiWebpackOptions /
	},
	exclude: [/^devServer in WebpackOptions /],
	include: [/^(_module|_compilation|_compiler) in NormalModuleLoaderContext /]
};

export const { nameMapping, exclude, include } = config;
