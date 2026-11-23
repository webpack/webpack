function f() {
	console.log("f");
	return 1;
}
function g() {
	console.log("g");
	return 2;
}
function picked(n, c) {
	if (c) return (n = (f(), g()));
	return 0;
}
function chained(n, c, d) {
	if (c) return (n = (f(), g()));
	if (d) return (n = (g(), f()));
	return (n = (f(), 3));
}
function thrown(n, c) {
	if (c) throw (n = (f(), g()));
	throw (n = (g(), 4));
}
function voided(n, c) {
	if (c) return void (n = (f(), g()));
	return 0;
}
console.log(picked(0, 1), picked(0, 0));
console.log(chained(0, 1, 0), chained(0, 0, 1), chained(0, 0, 0));
try {
	thrown(0, 1);
} catch (e) {
	console.log("caught", e);
}
try {
	thrown(0, 0);
} catch (e) {
	console.log("caught", e);
}
console.log(voided(0, 1), voided(0, 0));
