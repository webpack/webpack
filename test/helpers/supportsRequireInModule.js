"use strict";

module.exports = function supportsRequireInModule() {
	return Boolean(require("node:module").createRequire);
};
