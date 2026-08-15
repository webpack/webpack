"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// '.min.js' ends with '.js', so both have to be tried when naming an entry.
	resolve: { extensions: [".js", ".min.js"] }
};
