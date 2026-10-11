"use strict";

module.exports = {
	output: {
		module: true,
		// The test loader reports ENOENT for missing files; native import() uses
		// ERR_MODULE_NOT_FOUND instead.
		importFunctionName:
			"((url) => import(url).catch(error => { if (error.code === 'ENOENT') error.code = 'ERR_MODULE_NOT_FOUND'; throw error; }))",
		library: {
			type: "module"
		}
	}
};
