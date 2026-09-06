"use strict";

module.exports = {
	moduleScope(scope) {
		scope.APP = {
			get(module) {
				return Promise.resolve(() => `app ${module}`);
			}
		};
	}
};
