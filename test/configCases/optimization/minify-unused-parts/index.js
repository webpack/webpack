var log = [];

function note(value) {
	log.push(value);
	return value;
}

function parts() {
	var { x: left, y } = { x: 1, y: 2 };
	var [skipped, kept, last] = [3, 4, 5];
	return [left, kept];
}

function rest(o) {
	var { a, b, ...others } = o;
	return [a, others];
}

function self(value) {
	value = value;
	return note(value);
}

function dead() {
	var shared = 7;
	if (0) var shared = 5, fresh = 6;
	return [shared, fresh];
}

function unreadRest(first, ...unread) {
	return first;
}

function zeroed() {
	var large = { big: 1 };
	return (function (unused, used) {
		return used;
	})({ large }, ...[note("spread")]);
}

function extra() {
	return (function () {
		return 1;
	})((2, note("extra")), 3);
}

it("should drop the unread parts and arguments as written", () => {
	expect(parts()).toEqual([1, 4]);
	expect(rest({ a: 1, b: 2, c: 3 })).toEqual([1, { c: 3 }]);
	expect(self(8)).toBe(8);
	expect(dead()).toEqual([7, undefined]);
	expect(unreadRest(9, 10)).toBe(9);
	expect(unreadRest.length).toBe(1);
	expect(zeroed()).toBe("spread");
	expect(extra()).toBe(1);
	expect(log).toEqual([8, "spread", "extra"]);
});
