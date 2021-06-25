module.exports = function supportsRequireInModule() {
	// eslint-disable-next-line node/no-unsupported-features/node-builtins
	return !!require("module").createRequire;
};
