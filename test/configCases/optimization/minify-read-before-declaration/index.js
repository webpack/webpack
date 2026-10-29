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
