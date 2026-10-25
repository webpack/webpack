"use strict";

module.exports = {
	output: {
		chunkLoading: "import",
		chunkFormat: "module",
		publicPath: "https://test.cases/path/",
		importFunctionName: "(() => Promise.reject(manifestState.error))"
	}
};
