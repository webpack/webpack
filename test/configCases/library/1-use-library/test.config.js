"use strict";

module.exports = {
	moduleScope(scope) {
		scope.define = (deps, factory) => {
			scope.module.exports = factory();
		};
	},
	afterExecute() {
		delete global.webpackChunk;
	}
};
