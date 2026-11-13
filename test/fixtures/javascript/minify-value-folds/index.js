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

var o = {
	f() {
		return this === o;
	}
};

function f() {
	return "f";
}

function throws(run) {
	try {
		run();
		return "ran";
	} catch (e) {
		return e.name;
	}
}

function undefinedReads() {
	return [
		throws(() => {
			undefined.a;
		}),
		throws(() => undefined()),
		throws(() => new undefined())
	];
}

function booleans() {
	return [false.toString(), throws(() => new true())];
}

function truths(u, log) {
	if (u || 0) log.push("or");
	if (u && "s") log.push("and");
	if (u ?? !1) log.push("nullish");
	return log;
}

function shadowed(Infinity) {
	return [1e400, -1e400, { [1e400]: 1 }[Infinity], Infinity];
}

function nonFinite(a) {
	return [123456789 / 0, -1e300 * 1e10, 1 * "a", a / (3 / 0 * 2), 2 ** 2e3];
}

function pastEnd() {
	return [[10, 20][2], [1, 2][-1]];
}

function madeTests() {
	return [{} ? 1 : 2, [] ? 3 : 4, function () {} ? 5 : 6];
}

function nestedFolds() {
	return [(0 || (1 && f))(), (1 ? (0 ? o : f) : o)(), (0 || (1 && o.f))()];
}

it("should keep what throws reading or calling the global `undefined`", () => {
	expect(undefinedReads()).toEqual(["TypeError", "TypeError", "TypeError"]);
	expect(booleans()).toEqual(["false", "TypeError"]);
});

it("should read a logical test for its truth as its left side", () => {
	expect(truths(1, [])).toEqual(["or", "and", "nullish"]);
	expect(truths(0, [])).toEqual([]);
});

it("should print an infinity as `1/0` where a scope binds `Infinity`", () => {
	expect(shadowed(5)).toEqual([Infinity, -Infinity, undefined, 5]);
	expect(shadowed(6)[3]).toBe(6);
	expect(nonFinite(2)).toEqual([Infinity, -Infinity, NaN, 0, Infinity]);
	expect(nonFinite(-2)[3]).toBe(-0);
});

it("should fold an index past an array's end and a test made in place", () => {
	expect(pastEnd()).toEqual([undefined, undefined]);
	expect(madeTests()).toEqual([1, 3, 5]);
	expect(nestedFolds()).toEqual(["f", "f", false]);
});
