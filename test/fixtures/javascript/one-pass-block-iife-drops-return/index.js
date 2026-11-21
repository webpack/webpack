var log = [];
var read;
function use(value) {
	read = value;
}
!(function () {
	use(function () {
		return kept;
	});
	let kept = 1;
	return kept;
})();
function captures(state) {
	if (state !== null) {
		if (state.inner !== null) return true;
		return false;
	}
	var props = state;
	return props;
}
log.push(read(), captures({ inner: 1 }), captures({ inner: null }));
console.log(log.join());
