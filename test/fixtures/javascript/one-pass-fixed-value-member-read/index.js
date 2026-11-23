// A read of a property of what a constant always holds runs nothing.
function literal() {
	var o = { a: 1 };
	o.b;
	o.c;
	return o;
}
console.log(literal().a);
function declared() {
	class C {}
	C.bar;
	function f() {}
	f.baz;
	let s = "abc";
	s.qux;
	return [typeof C, typeof f, s];
}
console.log(declared().join());
// Unset, read in a closure or with a getter it may throw or run code.
function early() {
	try {
		o.b;
		console.log("read");
	} catch (e) {
		console.log(e.name);
	}
	var o = {};
	return o;
}
early();
early();
function closure() {
	function read() {
		return o.b;
	}
	try {
		read();
	} catch (e) {
		console.log(e.name);
	}
	let o = {};
	return o;
}
closure();
closure();
function getter() {
	var o = {
		get b() {
			console.log("getter");
		}
	};
	o.b;
	return o;
}
getter();
getter();
