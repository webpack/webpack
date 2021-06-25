module.exports = function supportsRequireInModule() {
	return !!require("module").createRequire;
};
