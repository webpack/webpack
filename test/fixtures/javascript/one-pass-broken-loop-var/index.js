// A loop leaving at once declares what its body declares past the `break`.
L1: for (var x = 0; x < 3; x++) {
	break L1;
	L2: for (var y = 0; y < 2; y++) {
		break L2;
	}
}
console.log(x, y);
for (var a = 0; a < 3; a++) {
	break;
	var b = 5, c;
}
console.log(a, b, c);
function inner() {
	"use strict";
	for (var i = 1; i < 3; i++) {
		break;
		var j;
	}
	return [i, j];
}
console.log(inner());
// A test running code, or a name declared elsewhere too, keeps the loop.
for (var p = 0; test(); p++) {
	break;
	var q;
}
function test() {
	console.log("test");
	return 1;
}
console.log(p, q);
var r = 7;
for (var s = 0; s < 3; s++) {
	break;
	var r;
}
console.log(r, s);
