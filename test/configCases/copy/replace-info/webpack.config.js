"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			// the second copy lands on the first one's name without asking for its
			// permissions, so it must not inherit the mode the first one carried
			{ from: "first", preservePermissions: true },
			{ from: "second" }
		]
	}
};
