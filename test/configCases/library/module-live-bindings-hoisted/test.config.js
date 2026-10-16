"use strict";

module.exports = {
	// the free `counter` other modules read is a global of the library's context
	moduleScope(scope) {
		scope.counter = "global";
	},
	findBundle(index) {
		return `main-${index}.mjs`;
	}
};
