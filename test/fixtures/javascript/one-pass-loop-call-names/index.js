// A function called once in a loop with fixed names prints its body there.
(function () {
	var o = { v: 5 }, p = { v: 6 };
	function add(j, q) {
		console.log(j.v + q.v);
	}
	for (var k = 0; k < 2; k++) add(o, p);
})();
// A loop's own name is written, so the call stays.
(function () {
	var i;
	function fn(j) {
		console.log(j);
	}
	for (i in { a: 1, b: 2 }) fn(i);
})();
// A nested function could shadow the name passed.
(function () {
	var o = { v: 5 };
	function fn(j) {
		[1].forEach(function (o) {
			console.log(j.v, o);
		});
	}
	for (var k = 0; k < 2; k++) fn(o);
})();
// Its own `arguments` and an argument past its parameters keep it in place.
(function () {
	var o = { v: 5 };
	function fn(j) {
		console.log(j.v, arguments.length);
	}
	function gn(j) {
		console.log(j.v);
	}
	for (var k = 0; k < 2; k++) fn(o), gn(o, o);
})();
// A parameter written in the body keeps it in place.
(function () {
	var o = 1;
	var n = { v: 1 };
	function fn(j) {
		(j = n), console.log(j.v, o);
	}
	for (var k = 0; k < 2; k++) fn(n);
})();
// Passed nothing, a parameter read keeps it in place.
(function () {
	function fn(j) {
		console.log(j);
	}
	for (var k = 0; k < 2; k++) fn();
})();
