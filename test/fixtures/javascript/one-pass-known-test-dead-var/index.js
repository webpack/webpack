var o = {};
function f(a) {
	if ((a.x = 1, 1)) {
		console.log("A");
	} else {
		var unused;
		console.log("B");
	}
	return a.x;
}
console.log(f(o));
function g(a) {
	if ((a.y = 2, 0)) {
		var read;
		console.log("B");
	} else {
		console.log("A", typeof read);
	}
}
g(o);
function h(a) {
	if ((a.z = 3, 1)) {
		console.log("A");
	} else {
		var hoisted;
		function inner() {}
	}
	return typeof inner;
}
console.log(h(o));
