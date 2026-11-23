// A `typeof` of a name set to an object made by running code keeps that code.
function x() {
	console.log("x");
	return 1;
}
function f() {
	var a = [x()];
	return typeof a;
}
console.log(f());
function g() {
	var b = { k: x() };
	return typeof b;
}
console.log(g());
function h() {
	var c = [1];
	return typeof c;
}
console.log(h());
