var checks = (function () {
	function object() {
		return () => ({}`x`);
	}
	function added() {
		return () => ({}`x`);
	}
	function member() {
		return () => ({}.key);
	}
	return [
		function () {
			return object()();
		},
		function () {
			return 1 + added()();
		},
		function () {
			return member()();
		}
	];
})();
console.log(checks.length, checks[2]());
