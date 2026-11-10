"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	experiments: {
		html: true
	},
	optimization: {
		// Production drops the bundle on a build error, so the placeholder this
		// case is about would never be rendered for the assertion to read.
		emitOnErrors: true
	}
};
