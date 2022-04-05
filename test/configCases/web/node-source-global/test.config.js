module.exports = {
	moduleScope(scope) {
		scope.global = scope.global || {};
		scope.global.value1 = "error";
		scope.globalThis = scope.globalThis || {};
		scope.globalThis.value1 = "value1";
	}
};
