// `>>>` converts each side to an integer itself: `(v|0)>>>s` is `v>>>s`
// where the other side runs nothing.
function shift(value, count) {
	return [(value | 0) >>> count, value >>> (count | 0), (value | 0) >>> (count | 0)];
}
// Beside a call, or beside another operator, the `|0` stays.
function kept(value, count) {
	return [(value | 0) >>> next(count), (value | 0) >> count, (value | 0) & count];
}
function next(count) {
	console.log("next", count);
	return count + 1;
}
console.log(shift(-1, 0), shift(4.7, 1), shift(2 ** 33 + 5, 33));
console.log(kept(-1, 0), kept(9, 2));
try {
	shift(1n, 1);
} catch (error) {
	console.log(error.name);
}
