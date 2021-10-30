"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			imports: true,
			backend: {
				listen: {
					host: "127.0.0.1"
				}
			}
		}
	}
};
