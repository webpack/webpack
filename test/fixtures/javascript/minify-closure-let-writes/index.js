// The config case's `it` and `expect`, logging what each assertion reads,
// so a print that changes a value or a throw runs otherwise.
var show = function (value) {
	if (typeof value === "function") return "[function]";
	try {
		return String(JSON.stringify(value, function (key, one) {
			return typeof one === "bigint" ? one + "n" : typeof one === "function" ? "[function]" : one;
		}));
	} catch (error) {
		return String(value);
	}
};
var it = function (title, body) {
	console.log("it", title);
	try {
		body(function () {});
	} catch (error) {
		console.log("throws", error && error.name);
	}
};
var expect = function (value) {
	var matchers = new Proxy({}, {
		get: function (target, name) {
			if (name === "not" || name === "resolves" || name === "rejects") return matchers;
			return function () {
				if (/Snapshot$/.test(name)) return;
				if (/^toThrow/.test(name) && typeof value === "function") {
					try {
						console.log(name, "returns", show(value()));
					} catch (error) {
						console.log(name, "throws", error && error.name);
					}
					return;
				}
				console.log(name, show(value));
			};
		}
	});
	return matchers;
};

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
