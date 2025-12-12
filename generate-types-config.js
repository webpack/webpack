"use strict";

module.exports = {
	nameMapping: {
		FsStats: /^Stats Import fs/,
		validateFunction: /^validate Import/,
		Configuration: /^WebpackOptions /,
		MultiConfiguration: /^MultiWebpackOptions /
	},
	exclude: [/^devServer in WebpackOptions /],
	include: [
		/^(_module|_compilation|_compiler|_importAttributes) in NormalModuleLoaderContext /
	]
};
