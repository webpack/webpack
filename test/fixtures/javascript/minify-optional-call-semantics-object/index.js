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

it("should throw when optionally calling an Object wrapper of null or undefined", () => {
	expect(() => Object(null)?.()).toThrow(TypeError);
	expect(() => Object(undefined)?.()).toThrow(TypeError);
});

it("should evaluate optional call arguments before rejecting an Object wrapper", () => {
	const calls = [];
	expect(() => Object(null)?.(calls.push(1))).toThrow(TypeError);
	expect(calls).toEqual([1]);
});

it("should preserve optional calls of wrapped functions and their receivers", () => {
	const object = {
		/** @returns {boolean} whether the call has no receiver */
		method() {
			return this === undefined;
		}
	};
	expect(Object(object.method)?.()).toBe(true);
	expect(Object(() => 42)?.()).toBe(42);
});
