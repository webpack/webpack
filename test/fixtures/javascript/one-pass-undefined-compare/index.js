var log = [];
function f(v) {
	log.push(v);
	return v;
}
const leak = () => {};
function scan() {
	let len = leak();
	return len === 123 ? "FAIL" : "PASS";
}
console.log(scan());
function unset(a) {
	let c = void 0;
	a();
	return [c === void 0, c !== null, c == null];
}
console.log(unset(function () {}).join());
function moved() {
	const k = () => {};
	return k() === void 0;
}
console.log(moved());
function written() {
	var c = void 0;
	function m() {
		c = 1;
	}
	m();
	return c === void 0;
}
console.log(written());
function passed() {
	const k = function (x) {};
	return k(f(2)) === void 0;
}
console.log(passed(), log.join());
