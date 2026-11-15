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

/**
 * @param {(value: number) => void} record receives the selected argument
 * @param {boolean} a selects the condition
 * @param {boolean} b first condition
 * @param {boolean} c second condition
 * @returns {void}
 */
function conditionalCalls(record, a, b, c) {
	if (a ? b : c) record(1);
	else record(2);
}

/**
 * @param {new (value: number) => { value: number }} Constructor records the argument
 * @param {boolean} a selects the condition
 * @param {boolean} b first condition
 * @param {boolean} c second condition
 * @returns {void}
 */
function conditionalConstructs(Constructor, a, b, c) {
	if (a ? b : c) new Constructor(1);
	else new Constructor(2);
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

it("should preserve the arguments of calls in both branches", () => {
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

it("should preserve a conditional test when selecting call arguments", () => {
	/** @type {number[]} */
	var seen = [];
	for (var a of [false, true]) {
		for (var b of [false, true]) {
			for (var c of [false, true]) {
				conditionalCalls(value => seen.push(value), a, b, c);
				expect(seen.pop()).toBe((a ? b : c) ? 1 : 2);
			}
		}
	}
});

it("should preserve a conditional test when selecting constructor arguments", () => {
	/** @type {number[]} */
	var seen = [];
	/**
	 * @param {number} value the selected argument
	 */
	function Record(value) {
		this.value = value;
		seen.push(value);
	}
	conditionalConstructs(Record, true, false, true);
	conditionalConstructs(Record, true, true, false);
	expect(seen).toEqual([2, 1]);
});

it("should print two `new`s of one local name as one", () => {
	expect(constructs(0).value).toBe(2);
	expect(constructs(1).value).toBe(1);
});
