var obj = { NaN: 1 };
console.log(obj[0 / 0], (function NaN() {
	return 0 / 0;
})());
try {
	throw 7;
} catch (NaN) {
	console.log(0 / 0, obj[0 / 0], NaN);
}
