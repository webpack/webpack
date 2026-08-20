"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			name: "MyLibrary",
			type: "umd",
			umdNamedDefine: true,
			umdAmdContainer: "sap.ui"
		}
	},
	externals: {
		"my-external": {
			root: "MyExternal",
			commonjs: "path",
			commonjs2: "path",
			amd: "my/external"
		}
	}
};
