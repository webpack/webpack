"use strict";

// Thin wrapper around less-loader. Bun aborts in its node:vm
// SourceTextModule.link() on less-loader's `import("less")`, so under Bun inject
// the CJS less to skip the dynamic import. On Node it delegates unchanged.
const lessLoader = require("less-loader");

module.exports = function loader(...args) {
	if (process.versions.bun) {
		const getOptions = this.getOptions.bind(this);
		this.getOptions = (schema) => ({
			implementation: require("less"),
			...getOptions(schema)
		});
	}
	return lessLoader.apply(this, args);
};
