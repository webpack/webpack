"use strict";

// Thin wrapper around less-loader that injects the CJS less implementation;
// less-loader's default `import("less")` crashes Bun's vm.
const lessLoader = require("less-loader");

module.exports = function loader(...args) {
	const getOptions = this.getOptions.bind(this);
	this.getOptions = (schema) => ({
		implementation: require("less"),
		...getOptions(schema)
	});
	return lessLoader.apply(this, args);
};
