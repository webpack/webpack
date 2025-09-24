"use strict";

module.exports = {
	moduleScope(scope) {
		delete scope.document.baseURI;
	}
};
