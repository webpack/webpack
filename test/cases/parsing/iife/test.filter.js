"use strict";

module.exports = (config) =>
	// TODO fails due to minimizer bug: https://github.com/terser/terser/issues/880
	!config.minimize;
