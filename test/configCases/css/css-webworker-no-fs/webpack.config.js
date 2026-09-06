"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "webworker",
	mode: "development",
	devtool: false,
	// only so this case can read its own output back; a worker build would not
	// resolve them, which is the very reason the runtime must not reach for `fs`
	externalsPresets: {
		node: true
	},
	module: {
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	experiments: {
		css: true,
		outputModule: true
	}
};
