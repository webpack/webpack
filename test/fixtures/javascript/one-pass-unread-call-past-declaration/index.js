var a = "outer";
(function (x) {
	var b = "GOOD" + x,
		e = "BAD",
		k = "!",
		e = b;
	console.log(e + k);
})("!"),
	(function () {
		var c;
		console.log(typeof c, a);
	})();
(function () {
	var a = 1;
	console.log(a);
})(), console.log(a);
var fns = [];
(function () {
	var f = 6;
	fns.push(function () {
		return f++;
	});
})(), console.log(fns[0](), fns[0]());
(function () {
	var k = 2;
	return;
	console.log(k);
})(), console.log("k");
(function () {
	var l = 1;
	if (l) return;
	console.log("l");
})(), console.log("after l");
(function () {
	var m = 1;
	m;
})(), console.log("m");
(function () {
	var n = 3;
	console.log(arguments.length, n);
})(1), console.log("n");
var x = [
	(function () {
		var o = 1;
		console.log(o);
	})(),
	2
];
console.log(x);
