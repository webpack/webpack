"use strict";

module.exports = {
	moduleScope(scope) {
		// A top-level `let` of a script that already ran: defined for the bare
		// identifier, but neither an own nor an inherited property of the global.
		scope.myLexical = { loaded: true };
	}
};
