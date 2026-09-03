"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		// keeps every module a table entry, so presence is what is asserted
		concatenateModules: false,
		moduleIds: "named"
	}
};
