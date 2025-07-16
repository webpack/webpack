"use strict";

module.exports = function supportsAsync() {
	// Node.js@10 has a bug with nested async/await
	if (process.version.startsWith("v10.")) {
		return false;
	}

	try {
		eval("async () => {}");
		return true;
	} catch (_err) {
		// Ignore
	}

	return false;
};
