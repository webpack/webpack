"use strict";

module.exports = {
	findBundle(i) {
		return [["deferred.js"], ["nested.js"]][i];
	}
};
