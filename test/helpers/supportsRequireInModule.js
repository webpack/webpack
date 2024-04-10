module.exports = function supportsRequireInModule() {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	return !!require("module").createRequire;
};
