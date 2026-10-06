"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// the bundle has to be emitted for the failing modules to be executed
	optimization: {
		emitOnErrors: true
	}
};
