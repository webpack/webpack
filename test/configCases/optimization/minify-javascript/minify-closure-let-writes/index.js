const log = [];

function settle(values) {
	let lastSeen,
		keep = function (value) {
			lastSeen = value;
			log.push(value);
		};
	values.forEach((value) => {
		lastSeen = value + 1;
	});
	values.forEach(keep);
	return values.length;
}

function early(run) {
	const write = () => {
		pending = run;
	};
	try {
		if (run) write();
	} catch (err) {
		return err.name;
	}
	let pending;
	write();
	return "late";
}

function remembered(values) {
	let seen;
	values.forEach((value) => {
		seen = value;
	});
	return () => seen;
}

it("should drop writes to a `let` from closures created after it, which nothing reads", () => {
	log.length = 0;
	expect(settle([1, 2])).toBe(2);
	expect(log).toEqual([1, 2]);
});

it("should keep a write that may run before its `let`, or one a closure reads", () => {
	expect(early(1)).toBe("ReferenceError");
	expect(early(0)).toBe("late");
	expect(remembered([3, 4])()).toBe(4);
});
