// A closure called before a `const` it reads is declared throws, its
// value unread.
(function () {
	function f() {
		return x + 1;
	}
	try {
		f();
		console.log("no throw");
	} catch (e) {
		console.log(e.name);
	}
	const x = 1;
})();

// The same with `let`.
(function () {
	function f() {
		return y + 1;
	}
	try {
		f();
		console.log("no throw");
	} catch (e) {
		console.log(e.name);
	}
	let y = 1;
})();

// Called after the declaration, the unread call runs nothing.
(function () {
	function f() {
		return z + 1;
	}
	const z = 1;
	f();
	console.log("after", z);
})();
