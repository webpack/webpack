"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	output: { module: true },
	experiments: { outputModule: true },
	externals: {
		// browser-only global: the page location, present on web and absent on node
		browserLocation: "global location"
	}
};
