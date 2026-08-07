"use strict";

module.exports = {
	// The ESM runner has no `__dirname`; the case reads the emitted bundle back.
	moduleScope(scope, options) {
		scope.__dirname = options.output.path;
	}
};
