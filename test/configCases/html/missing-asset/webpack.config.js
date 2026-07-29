"use strict";

// TODO production should report the same clean "Module not found" error as
// the missing-asset-development sibling case instead of this codegen crash
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	experiments: {
		html: true
	}
};
