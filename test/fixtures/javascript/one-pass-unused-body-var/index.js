var b = 10;
var c = 0;
function f() {
	c++;
	return c;
}
!function (arg) {
	for (var key in "hi") var n = arg.baz, n = [b = 42];
}({ baz: 1 });
!function () {
	for (var i = 0; i < 3; i++) var n = f(), m = i;
	console.log("kept", m, c);
}();
!function (o) {
	for (var k in o) var n = 1;
	for (var j of [1, 2]) var p = f(), q = f();
	console.log("for-of", j, c);
}({ a: 1, b: 2 });
!function (x) {
	while (x--) var n = f(), r = (function () {
		return c;
	})();
	console.log("while", x, c);
}(2);
!function () {
	for (var i = 0; i < 2; i++) var n = f();
	console.log("read", n);
}();
console.log(b, c);
