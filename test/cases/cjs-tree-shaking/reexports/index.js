it("should allow to reexport a exports object (this, exports)", () => {
	expect(require("./reexport-whole-exports?1").module1.abc).toBe("abc");
	expect(require("./reexport-whole-exports?2").module2.abc).toBe("abc");
	expect(require("./reexport-whole-exports?3").module3.abc).toBe("abc");
	expect(require("./reexport-whole-exports?4").module4.abc).toBe("abc");
});

it("should allow to reexport a exports object (module.exports, object literal)", () => {
	expect(require("./reexport-whole-module-exports?1").module1.abc).toBe("abc");
	expect(require("./reexport-whole-module-exports?2").module2.abc).toBe("abc");
	expect(require("./reexport-whole-module-exports?3").module3.abc).toBe("abc");
	expect(require("./reexport-whole-module-exports?4").module4.abc).toBe("abc");
});

it("should allow to reexport a imported property (this, exports)", () => {
	expect(require("./reexport-property-exports?1").property1).toBe("abc");
	expect(require("./reexport-property-exports?2").property2).toBe("abc");
	expect(require("./reexport-property-exports?3").property3).toBe("abc");
	expect(require("./reexport-property-exports?4").property4).toBe("abc");
});

it("should allow to reexport a imported property (module.exports, object literal)", () => {
	expect(require("./reexport-property-module-exports?1").property1).toBe("abc");
	expect(require("./reexport-property-module-exports?2").property2).toBe("abc");
	expect(require("./reexport-property-module-exports?3").property3).toBe("abc");
	expect(require("./reexport-property-module-exports?4").property4).toBe("abc");
});

it("should allow to reexport a reexported exports object (this, exports)", () => {
	expect(require("./reexport-reexport-exports?1").reexport1.abc).toBe("abc");
	expect(require("./reexport-reexport-exports?2").reexport2.abc).toBe("abc");
	expect(require("./reexport-reexport-exports?3").reexport3.abc).toBe("abc");
	expect(require("./reexport-reexport-exports?4").reexport4.abc).toBe("abc");
});

it("should allow to reexport a reexported exports object (module.exports, object literal)", () => {
	expect(require("./reexport-reexport-module-exports?1").reexport1.abc).toBe(
		"abc"
	);
	expect(require("./reexport-reexport-module-exports?2").reexport2.abc).toBe(
		"abc"
	);
	expect(require("./reexport-reexport-module-exports?3").reexport3.abc).toBe(
		"abc"
	);
	expect(require("./reexport-reexport-module-exports?4").reexport4.abc).toBe(
		"abc"
	);
});

it("should keep executing modules even when unused", () => {
	const counter = require("./counter");
	counter.value = 0;
	exports.unused1 = require("./add-to-counter?1");
	exports.unused2 = require("./add-to-counter?2").abc;
	expect((exports.unused3 = require("./add-to-counter?3").abc)).toBe(42);
	expect(counter.value).toBe(3);
	if (process.env.NODE_ENV === "production") {
		expect(require("./add-to-counter?1").abcUsed).toBe(false);
		expect(require("./add-to-counter?2").abcUsed).toBe(false);
	}
	expect(require("./add-to-counter?3").abcUsed).toBe(true);
});

it("should allow to reexport a reexported module that bails out (indirect)", () => {
	const abc = require("./reexport?reexport-whole-exports?bailout").module1.abc;
	const bailout = Object(require("./module?we1?bailout"));
	expect(abc).toBe(bailout.abc);
});

it("should allow to reexport a reexported module that bails out (direct)", () => {
	const abc = require("./reexport?module?bailout").abc;
	const bailout = Object(require("./module?bailout"));
	expect(abc).toBe(bailout.abc);
});
