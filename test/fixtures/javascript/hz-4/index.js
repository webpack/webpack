var x = 1;
function f() {
	var v = g();
	h(x, v);
}
this.g = function () {
	this.x = 2;
	return 3;
};
this.h = function (a, b) {
	console.log(a, b);
};
f();
