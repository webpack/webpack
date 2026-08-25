"use strict";

const nodeVersion = process.versions.node.split(".").map(Number);

module.exports = function supportsEslintScope() {
	// eslint-scope 9's own `engines.node` — it parses as ES2018, so an older
	// node loads it and only fails once it runs
	if (nodeVersion[0] >= 24) {
		return true;
	} else if (nodeVersion[0] === 22 && nodeVersion[1] >= 13) {
		return true;
	} else if (nodeVersion[0] === 20 && nodeVersion[1] >= 19) {
		return true;
	}
	return false;
};
