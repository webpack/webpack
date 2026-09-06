"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	experiments: {
		css: true
	},
	optimization: {
		// Production drops the bundle on a build error, so the stylesheet this
		// case reads back would never be emitted.
		emitOnErrors: true
	},
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
