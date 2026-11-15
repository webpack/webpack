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

"use strict";

it("should preserve an array rest assignment target", () => {
	let value = 1;
	[...[value][0]] = [2, 3];
	expect(value).toBe(1);
});

it("should preserve an object rest assignment target", () => {
	let value = 1;
	({ ...[value][0] } = { answer: 2 });
	expect(value).toBe(1);
});

it("should preserve nested rest assignment targets", () => {
	let value = 1;
	({ answer: [...[value][0]] } = { answer: [2, 3] });
	expect(value).toBe(1);
	for ([...[value][0]] of [[2, 3]]) {
		expect(value).toBe(1);
	}
});

it("should preserve ordinary and defaulted assignment targets", () => {
	let value = 1;
	[[value][0]] = [2];
	({ answer: [value][0] } = { answer: 2 });
	[[value][0] = 2] = [];
	({ answer: [value][0] = 2 } = {});
	expect(value).toBe(1);
});

it("should preserve direct writes and loop targets", () => {
	let value = 1;
	[value][0] = 2;
	[value][0]++;
	delete [value][0];
	for ([value][0] of [2]) {
		expect(value).toBe(1);
	}
});

it("should still read values in computed keys and defaults", () => {
	let value;
	({ [["answer"][0]]: value = [2][0] } = {});
	expect(value).toBe(2);
	({ [["answer"][0]]: value } = { answer: 3 });
	expect(value).toBe(3);
});

it("should still read an array element inside a property assignment target", () => {
	const value = {};
	[value][0].answer = 2;
	expect(value.answer).toBe(2);
	value[["answer"][0]] = 3;
	expect(value.answer).toBe(3);
});

it("should still read array elements in spread expressions", () => {
	expect([...[[2, 3]][0]]).toEqual([2, 3]);
	expect({ ...[{ answer: 2 }][0] }).toEqual({ answer: 2 });
});
