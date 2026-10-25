"use strict";

module.exports = {
	output: {
		module: true,
		publicPath: "./",
		// Native browser imports report missing modules as TypeError, without a code.
		importFunctionName:
			"((url) => manifestState.error ? Promise.reject(manifestState.error) : import(url).catch(error => { if (error.code === 'ENOENT') throw new TypeError('Failed to fetch dynamically imported module'); throw error; }))",
		library: { type: "module" }
	}
};
