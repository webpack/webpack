"use strict";

const nodeVersion = process.versions.node.split(".").map(Number);

module.exports = function supportsEslintScope() {
	// eslint-scope 9's own `engines.node`. It parses as ES2018, so an old Node
	// loads it and only fails once it runs — keep this in step with the
	// dependency rather than with the syntax it happens to use today.
	if (nodeVersion[0] >= 24) {
		return true;
	} else if (nodeVersion[0] === 22 && nodeVersion[1] >= 13) {
		return true;
	} else if (nodeVersion[0] === 20 && nodeVersion[1] >= 19) {
		return true;
	}
	return false;
};
