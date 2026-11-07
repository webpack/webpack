var log = [];

function push(value) {
	log.push(value);
	return value;
}

function F(value) {
	this.value = value;
}

function calls(record, c) {
	if (c) {
		record(1, "a");
	} else {
		record(2, "a");
	}
}

function tests(a, b) {
	if (push(a)) {
		if (push(b)) log.push("both");
		else log.push("not");
	} else log.push("not");
}

function constructs(c) {
	return c ? new F(1) : new F(2);
}

it("should print an `if` calling one local name in both branches as one call", () => {
	var seen = [];
	calls((value, tag) => seen.push(value + tag), 0);
	calls((value, tag) => seen.push(value + tag), 1);
	expect(seen).toEqual(["2a", "1a"]);
});

it("should join the tests of an `if` holding an `if` with a branch alike", () => {
	log.length = 0;
	tests(1, 0);
	tests(0, 1);
	tests(1, 1);
	expect(log).toEqual([1, 0, "not", 0, "not", 1, 1, "both"]);
});

it("should print two `new`s of one local name as one", () => {
	expect(constructs(0).value).toBe(2);
	expect(constructs(1).value).toBe(1);
});
