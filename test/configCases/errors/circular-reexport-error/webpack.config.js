"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				// The spec makes a cycle in `ResolveExport` a link error, so asking
				// for errors has to escalate the circular diagnostic too
				reexportExportsPresence: "error"
			}
		}
	}
};
