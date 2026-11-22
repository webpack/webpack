var b = 7,
	y = 8;
if (0) {
	var a = 1,
		[x, y, z] = [2, 3, 4],
		b = 5;
}
console.log(a, x, y, z, b);
function named() {
	var c = 1;
	if (false) {
		var c = 2;
	}
	return c;
}
function patterned(k) {
	var d = 3;
	if (!1) {
		var [d = k()] = [];
	}
	return d;
}
function after() {
	var e = "s";
	return e + e;
	var e = 4;
}
function counted() {
	var f = 1;
	if (0) {
		var f = 2;
	}
	f++;
	return f;
}
console.log(named(), patterned(), after(), counted());
