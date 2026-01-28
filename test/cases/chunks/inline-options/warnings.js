"use strict";

module.exports = (options) => {
	if (options.mode === "development") {
		return [];
	}
	return Array.from({ length: 15 }).fill(
		/You don't need `webpackExports` if the usage of dynamic import is statically analyse-able/
	);
};
