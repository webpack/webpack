"use strict";

// The fixture uses logical assignment, which Node.js parses from 15 onward.
/** @returns {boolean} whether the runtime can execute the bundle */
module.exports = function filter() {
	return Number(process.versions.node.split(".")[0]) >= 15;
};
