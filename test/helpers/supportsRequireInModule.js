"use strict";

module.exports = function supportsRequireInModule() {
	return Boolean(require("module").createRequire);
};
