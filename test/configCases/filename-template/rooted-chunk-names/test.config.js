"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(index) {
		return index === 0 ? "bundle0.js" : "bundle1.js";
	}
};
