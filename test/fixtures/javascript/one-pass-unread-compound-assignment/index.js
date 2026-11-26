var a = 3;
a **= 2;
var b = 1;
b += 2;
b <<= 1;
console.log("b");
function f() {
	var c = 4;
	c -= 1;
	c++;
	console.log("c");
}
f();
function g(d) {
	var e = 1;
	e += d;
	console.log("e");
}
g({ valueOf: function () { console.log("valueOf"); return 1; } });
function h() {
	var s = "s";
	s += 1;
	return s;
}
console.log(h());
const k = 1;
try {
	k += 1;
} catch (error) {
	console.log("caught");
}
