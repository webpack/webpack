"use strict";

module.exports = {
	output: {
		...require("../module-chunk-loading-browser/webpack.config").output,
		module: false,
		scriptType: "module",
		importMetaName: "moduleMeta",
		chunkLoading: "import",
		chunkFormat: "module",
		filename: "bundle.mjs",
		library: { type: "var", name: "test" }
	}
};
