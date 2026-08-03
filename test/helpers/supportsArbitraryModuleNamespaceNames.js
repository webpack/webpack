"use strict";

const vm = require("vm");

module.exports = function supportsArbitraryModuleNamespaceNames() {
	try {
		// Module-only syntax, so it can't be feature detected with `eval`
		// eslint-disable-next-line no-new
		new vm.SourceTextModule('const a = 1; export { a as "b c" };');
		return true;
	} catch (_err) {
		return false;
	}
};
