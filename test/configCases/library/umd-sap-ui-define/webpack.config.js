"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			name: "MyLibrary",
			type: "umd",
			umdNamedDefine: true,
			umdSapUiDefine: true,
			auxiliaryComment: {
				sapUiDefine: "SAPUI5 module loader"
			}
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
