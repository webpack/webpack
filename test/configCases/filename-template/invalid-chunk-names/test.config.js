"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(index) {
		return index === 0 ? "node/main.js" : "web/js/main.js";
	}
};
