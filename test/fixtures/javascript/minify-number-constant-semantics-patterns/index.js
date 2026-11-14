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

it("should preserve read-only Number constants in assignment patterns", () => {
	expect(() => {
		[Number.POSITIVE_INFINITY] = [7];
	}).toThrow(TypeError);
	expect(() => {
		[Number.EPSILON] = [7];
	}).toThrow(TypeError);
	expect(() => {
		({ value: Number.NEGATIVE_INFINITY } = { value: 7 });
	}).toThrow(TypeError);
	expect(() => {
		[Number.POSITIVE_INFINITY = 7] = [];
	}).toThrow(TypeError);
	expect(() => {
		[...Number.POSITIVE_INFINITY] = [7];
	}).toThrow(TypeError);
	expect(() => {
		({ ...Number.POSITIVE_INFINITY } = { value: 7 });
	}).toThrow(TypeError);
	expect(() => {
		for ([Number.POSITIVE_INFINITY] of [[7]]) {}
	}).toThrow(TypeError);
});

it("should still read Number constants in computed keys and defaults", () => {
	let value;
	({ [Number.POSITIVE_INFINITY]: value = Number.NEGATIVE_INFINITY } = {});
	expect(value).toBe(-Infinity);
});
