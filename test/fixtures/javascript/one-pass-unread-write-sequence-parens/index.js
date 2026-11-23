function f() {
	console.log("f");
	return 1;
}
function g() {
	console.log("g");
	return 2;
}
var o = {
	m: function () {
		return this === o;
	}
};
function back(n) {
	return (n = (f(), g()));
}
function thrown(n, c) {
	if (c) throw (n = (f(), g()));
	return 3;
}
function picked(n, c) {
	if (c) return (n = (f(), g()));
	return 0;
}
function added(n) {
	return 5 + (n = (f(), g()));
}
function called(n) {
	return (n = (f(), o.m))();
}
function stated(n) {
	n = (f(), g());
	for (n = (g(), f()); 0; );
}
console.log(back(), back(), picked(0, 1), picked(0, 0), added(), called());
stated();
try {
	thrown(0, 1);
} catch (e) {
	console.log("caught", e);
}
console.log(thrown(0, 0));
