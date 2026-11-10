"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(i) {
		return [`main-${i}.js`];
	}
};
