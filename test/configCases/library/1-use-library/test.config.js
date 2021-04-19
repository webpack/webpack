module.exports = {
	moduleScope(scope) {
		scope.define = factory => {
			scope.module.exports = factory();
		};
	}
};
