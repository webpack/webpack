"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			test: module => !/moduleB/.test(module.nameForCondition())
		}
	}
};
