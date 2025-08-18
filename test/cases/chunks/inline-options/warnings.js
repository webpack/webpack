"use strict";

module.exports = (options) => {
	if (options.mode === "development") {
		return [];
	}
	return [
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/,
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/
	];
};
