"use strict";

module.exports = {
	moduleScope(scope) {
		scope.ABC = {
			get(module) {
				return Promise.resolve(() => `abc ${module}`);
			}
		};
		scope.DEF = {
			get(module) {
				return Promise.resolve(() => `def ${module}`);
			}
		};
	}
};
