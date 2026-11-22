var b = 7,
	y = 8;
if (0) {
	var a = 1,
		[x, y, z = later] = [2, 3, 4],
		b = 5;
}
var later = 9;
console.log(a, x, y, z, b, later);
function rest() {
	if (false) {
		var [m, ...n] = [1, 2];
	}
	return [m, n];
}
function setLater() {
	if (0) {
		var [k] = [1];
	}
	k = 5;
	return k;
}
function typed() {
	if (!1) {
		var [t] = [1];
	}
	return typeof t;
}
console.log(rest(), setLater(), typed());
if (0) {
	var {
		w = 0,
		v: [u, , { s, p: r = 7 }] = [1, 2, { s: 3 }]
	} = {};
}
console.log(w, r, u, s);
if (0) {
	var { shown } = { shown: 1 };
}
console.log(JSON.stringify({ shown }), shown);
