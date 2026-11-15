var n = 0;
function c() {
	n++;
	return 1;
}
function f(v, s) {
	try {
		return [(~v | 0) >>> c(), (-v | 0) >>> c(), (v * v | 0) >>> c(), (++v | 0) >>> c(), (1n | 0) >>> c()];
	} catch (e) {
		return n;
	}
}
function g(v, s) {
	return [(!v | 0) >>> s, (typeof v | 0) >>> s, (-1 | 0) >>> s, (~5 | 0) >>> s];
}
console.log(f(1n), f(2), g(1, 1).join());
