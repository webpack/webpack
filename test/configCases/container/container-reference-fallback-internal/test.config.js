"use strict";

module.exports = {
	moduleScope(scope) {
		scope.ABC = {
			get(module) {
				return new Promise((resolve) => {
					resolve(() => `abc ${module}`);
				});
			}
		};
	}
};
