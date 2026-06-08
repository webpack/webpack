it("should reexport a whole module via Object.defineProperty value (exports, module.exports, this)", () => {
	expect(require("./reexport-whole-define?1").module1.abc).toBe("abc");
	expect(require("./reexport-whole-define?2").module2.abc).toBe("abc");
	expect(require("./reexport-whole-define?3").module3.abc).toBe("abc");
});

it("should reexport an imported property via Object.defineProperty value (exports, module.exports, this)", () => {
	expect(require("./reexport-property-define?1").property1).toBe("abc");
	expect(require("./reexport-property-define?2").property2).toBe("abc");
	expect(require("./reexport-property-define?3").property3).toBe("abc");
});

it("should reexport a reexported module via Object.defineProperty value", () => {
	expect(require("./reexport-reexport-define?1").reexport1.abc).toBe("abc");
	expect(require("./reexport-reexport-define?2").reexport2.abc).toBe("abc");
	expect(require("./reexport-reexport-define?3").reexport3.abc).toBe("abc");
});

it("should reexport a deeply nested property via Object.defineProperty value", () => {
	expect(require("./reexport-nested?1").nested).toBe("nested-value");
});

it("should reexport via a lazy Object.defineProperty getter (arrow, function, method)", () => {
	expect(require("./reexport-getter-define?1").getter1.abc).toBe("abc");
	expect(require("./reexport-getter-define?2").getter2).toBe("abc");
	expect(require("./reexport-getter-define?3").getter3.abc).toBe("abc");
});

it("should keep executing eager (value) reexported modules even when unused", () => {
	const counter = require("./counter");
	counter.value = 0;
	Object.defineProperty(exports, "unused1", {
		value: require("./add-to-counter?1")
	});
	Object.defineProperty(exports, "unused2", {
		value: require("./add-to-counter?2").abc
	});
	expect(counter.value).toBe(2);
	if (process.env.NODE_ENV === "production") {
		expect(require("./add-to-counter?1").abcUsed).toBe(false);
		expect(require("./add-to-counter?2").abcUsed).toBe(false);
	}
});

it("should not execute a reexported module until the getter is accessed", () => {
	const counter = require("./counter");
	counter.value = 0;
	const m = require("./reexport-lazy-getter");
	// the require ran, but the lazy getter has not been accessed yet
	expect(counter.value).toBe(0);
	// accessing the getter triggers the underlying require
	expect(m.lazy.abc).toBe(42);
	expect(counter.value).toBe(1);
});

it("should preserve the setter when a get/set descriptor wraps a reexport", () => {
	const m = require("./reexport-getter-setter?1");
	expect(m.value).toBe("abc"); // getter returns the reexported value
	m.value = "written"; // setter must still exist (would throw if dropped)
	expect(m.getLastSet()).toBe("written");
	expect(m.value).toBe("abc"); // getter is unaffected by the write
});

it("should never execute a module behind an unused getter reexport", () => {
	const counter = require("./counter");
	counter.value = 0;
	require("./reexport-unused-getter");
	expect(counter.value).toBe(0);
});
