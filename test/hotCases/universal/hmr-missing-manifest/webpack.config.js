"use strict";

module.exports = {
	...require("../../hmr-download-manifest/module-chunk-loading-browser/webpack.config"),
	entry:
		require.resolve("../../hmr-download-manifest/module-chunk-loading-browser/index")
};
