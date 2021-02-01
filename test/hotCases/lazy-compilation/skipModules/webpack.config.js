"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			skipModule: name => /moduleB/.test(name)
		}
	}
};
