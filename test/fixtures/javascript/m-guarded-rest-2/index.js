(() => {
	if (c) return;
	return 1;
})(a);
function f() {
	if (c) return;
	return (() => {})();
}
