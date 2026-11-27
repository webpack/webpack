var log = [];

function note(value) {
	log.push(value);
	return value;
}

function joined() {
	return [void 0] + "a" + ([null, void 0] + "b");
}

function negated(x, y) {
	return (0 | !(x < 0)) ^ y;
}

function bigint(x) {
	return (0 | x) ^ 1n;
}

function picked() {
	return { a: { b: 1 }, b: function () {} }.a;
}

function unread() {
	~(function () {})(note("tilde"));
	-(function () {})(note("minus"), note("again"));
	~void note("void");
}

function mode() {
	return typeof FLAGS !== "undefined" ? FLAGS?.mode : "prod";
}

it("should fold literal reads and unread conversions as written", () => {
	expect(joined()).toBe("a,b");
	// Read off an array, the arguments keep `negated` from folding at its calls.
	const values = [1, -1, 0];
	expect(negated(values[0], values[2])).toBe(1);
	expect(negated(values[1], values[2])).toBe(0);
	expect(() => bigint(1n)).toThrow(TypeError);
	expect(() => bigint(2n)).toThrow(TypeError);
	expect(picked()).toEqual({ b: 1 });
	unread();
	expect(log).toEqual(["tilde", "minus", "again", "void"]);
	expect(mode()).toBe("prod");
});
