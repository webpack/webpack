module.exports = {
	moduleScope(scope) {
		scope.define = factory => {
			scope.module.exports = factory();
		};
	},
	afterExecute() {
		delete global.webpackChunk;
	}
};
