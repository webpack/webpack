// A `var` with no value declared again where a declarator sets it goes.
var top;
var top = typeof top;
console.log(top);
function same(o) {
	var a;
	var a = o && o.b;
	return a;
}
console.log(same({ b: 1 }), same(null));
function after() {
	var a = 1;
	var a;
	return a;
}
console.log(after());
// One dead code sets declares the name still.
function dead() {
	var a;
	if (0) {
		var a = 1;
	}
	return typeof a;
}
console.log(dead());
function exits(f) {
	var a;
	f(a);
	return;
	var a = 1;
}
exits(console.log);
function loop(o) {
	var k;
	for (var k in o);
	return k;
}
console.log(loop({ x: 1 }));
