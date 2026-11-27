// A loop whose test is known false and runs nothing prints its start alone.
var x;
while (x && 0) f();
for (var a = 1, b; a && (b || a) && 0; ++a) {
	f();
	var moo;
}
function f() {
	for (var i = 0; 0; ) {
		var q;
	}
	return [i, q];
}
function g() {
	for (var j = 1; j && 0; ) f();
	return j;
}
function h(probe) {
	for (; probe.x && 0; ) {
		var r;
	}
	return r;
}
function k(c) {
	for (var n = 0; c && 0; n++) {
		var s = n;
	}
	return [n, s];
}
console.log(x, a, b, moo, f(), g(), h({ get x() { console.log("read"); return 1; } }), k(1));
