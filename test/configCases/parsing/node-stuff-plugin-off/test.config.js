"use strict";

module.exports = {
	moduleScope(scope) {
		delete scope.__dirname;
		delete scope.__filename;
	}
};
