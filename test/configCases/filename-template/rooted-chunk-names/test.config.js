"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(index) {
		return `bundle${index}.js`;
	}
};
