function late() {
	const read = [];
	function first() {
		return limit;
	}
	try {
		read.push(first());
	} catch (err) {
		read.push(err.name);
	}
	const limit = 3;
	read.push(first(), limit * 2);
	return read;
}

function named() {
	const read = [];
	try {
		read.push(label.length);
	} catch (err) {
		read.push(err.name);
	}
	let label = "four";
	read.push(label.length);
	return read;
}

it("should fold a `let` or `const` read after its declaration, keeping a read that may throw before it", () => {
	expect(late()).toEqual(["ReferenceError", 3, 6]);
	expect(named()).toEqual(["ReferenceError", 4]);
});

function hoisted() {
	const read = [];
	try {
		read.push(get());
	} catch (err) {
		read.push(err.name);
	}
	let value = 5;
	function get() {
		return value;
	}
	read.push(get());
	return read;
}

it("should keep a read a function declared after a `let` may make before it is set", () => {
	expect(hoisted()).toEqual(["ReferenceError", 5]);
});
