"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle() {
		return ["runtime.js", "a.js"];
	}
};
