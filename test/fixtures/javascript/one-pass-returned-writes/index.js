// A `return a=x,a` of a local returns `x`: the write nothing reads goes.
function set(value) {
	var a;
	return (a = value()), a;
}
console.log(set(function () {
	return "PASS";
}));
function zero() {
	let a;
	return (a = 0), a;
}
console.log(zero());
// A closure reads the name later, so the write stays.
var read;
function kept() {
	var a = 1;
	read = function () {
		return a;
	};
	return (a = 2), a;
}
console.log(kept(), read());
// A `finally` reads what the `return` set.
function settled() {
	var a;
	try {
		return (a = "set"), a;
	} finally {
		console.log(a);
	}
}
console.log(settled());
// A global name stays: a getter may read it.
var outer;
function global() {
	return (outer = 4), outer;
}
console.log(global(), outer);
