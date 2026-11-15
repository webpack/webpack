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

it("should preserve direct and computed regular expression property writes", () => {
	expect(() => {
		/a/.source = "b";
	}).toThrow(TypeError);
	expect(() => {
		/a/["source"] = "b";
	}).toThrow(TypeError);
	expect(() => {
		for (/a/.source of ["b"]) {
			throw new Error("unreachable");
		}
	}).toThrow(TypeError);
});

it("should preserve regular expression properties in assignment patterns", () => {
	expect(() => {
		({ answer: /a/.source } = { answer: "b" });
	}).toThrow(TypeError);
	expect(() => {
		[/a/.source] = ["b"];
	}).toThrow(TypeError);
});

it("should preserve computed regular expression properties in patterns", () => {
	expect(() => {
		({ answer: /a/["source"] } = { answer: "b" });
	}).toThrow(TypeError);
});

it("should preserve regular expression properties in rest targets", () => {
	expect(() => {
		[.../a/.source] = ["b"];
	}).toThrow(TypeError);
	expect(() => {
		({ .../a/.source } = { answer: "b" });
	}).toThrow(TypeError);
});

it("should preserve regular expression properties in defaulted targets", () => {
	expect(() => {
		[/a/.source = "b"] = [];
	}).toThrow(TypeError);
	expect(() => {
		({ answer: /a/.source = "b" } = {});
	}).toThrow(TypeError);
});

it("should preserve regular expression properties in nested loop targets", () => {
	expect(() => {
		for ({ answer: [.../a/.source] } of [{ answer: ["b"] }]) {
			throw new Error("unreachable");
		}
	}).toThrow(TypeError);
});

it("should still read regular expression properties in keys and defaults", () => {
	let value;
	({ [/a/.source]: value = /b/.source } = {});
	expect(value).toBe("b");
	({ [/a/.source]: value } = { a: "c" });
	expect(value).toBe("c");
});

it("should still read regular expression properties in spread expressions", () => {
	expect([.../ab/.source]).toEqual(["a", "b"]);
	expect({ .../ab/.source }).toEqual({ 0: "a", 1: "b" });
});
