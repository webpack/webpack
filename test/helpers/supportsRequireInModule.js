module.exports = function supportsRequireInModule() {
	// eslint-disable-next-line node/no-unsupported-features/node-builtins
	return Boolean(require("module").createRequire);
};
