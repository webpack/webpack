"use strict";
var saved;
function save(cb) {
	saved = cb;
}
function run(x, cb = () => x) {
	save(cb);
	return (x += 1);
}
console.log(run(1), saved());
function pattern(x, { y = () => x } = {}) {
	saved = y;
	return (x += 1);
}
console.log(pattern(1), saved());
var arrow = (x, cb = () => x) => (save(cb), (x *= 3));
console.log(arrow(2), saved());
function plain(x, y = 1) {
	return (x += y);
}
console.log(plain(1));
