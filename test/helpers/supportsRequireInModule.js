module.exports = function supportsRequireInModule() {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	return Boolean(require("module").createRequire);
};
