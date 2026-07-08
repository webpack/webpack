"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	// `css: false` opts out of the "auto" default so this case keeps exercising the
	// CSS-disabled path it is meant to verify.
	experiments: {
		html: true,
		css: false
	}
};
