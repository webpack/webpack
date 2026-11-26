// A `let` nothing sets reads `undefined` where it is surely declared.
function chain() {
	let x;
	x?.y?.();
	return 1;
}
function member() {
	let n;
	return n.NaN;
}
let u;
{
	let v;
	console.log(u, v);
}
function hoisted() {
	try {
		return f();
	} catch (e) {
		return e.name;
	}
	let v;
	function f() {
		return v?.a;
	}
}
function before() {
	try {
		return v?.a;
	} catch (e) {
		return e.name;
	}
	let v;
}
function jumped(c) {
	try {
		switch (c) {
			case 0:
				let v;
			case 1:
				return v?.a;
		}
	} catch (e) {
		return e.name;
	}
}
function written() {
	let v;
	v = { a: 1 };
	return v?.a;
}
function evaluated() {
	let v;
	return eval("v?.a");
}
try {
	member();
} catch (e) {
	console.log(e.name);
}
console.log(chain(), hoisted(), before(), jumped(1), jumped(0), written(), evaluated());
