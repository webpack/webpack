"use strict";

/** @returns {never} never */
module.exports = function loader() {
	throw new Error("loader blew up");
};
