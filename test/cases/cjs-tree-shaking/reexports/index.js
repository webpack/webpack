it("should allow to reexport a exports object (this, exports)", () => {
	expect(require("./reexport-whole-exports?1").m1.abc).toBe("abc");
	expect(require("./reexport-whole-exports?2").m2.abc).toBe("abc");
	expect(require("./reexport-whole-exports?3").m3.abc).toBe("abc");
	expect(require("./reexport-whole-exports?4").m4.abc).toBe("abc");
});

it("should allow to reexport a exports object (module.exports, object literal)", () => {
	expect(require("./reexport-whole-module-exports?1").m1.abc).toBe("abc");
	expect(require("./reexport-whole-module-exports?2").m2.abc).toBe("abc");
	expect(require("./reexport-whole-module-exports?3").m3.abc).toBe("abc");
	expect(require("./reexport-whole-module-exports?4").m4.abc).toBe("abc");
});

it("should allow to reexport a imported property (this, exports)", () => {
	expect(require("./reexport-property-exports?1").p1).toBe("abc");
	expect(require("./reexport-property-exports?2").p2).toBe("abc");
	expect(require("./reexport-property-exports?3").p3).toBe("abc");
	expect(require("./reexport-property-exports?4").p4).toBe("abc");
});

it("should allow to reexport a imported property (module.exports, object literal)", () => {
	expect(require("./reexport-property-module-exports?1").p1).toBe("abc");
	expect(require("./reexport-property-module-exports?2").p2).toBe("abc");
	expect(require("./reexport-property-module-exports?3").p3).toBe("abc");
	expect(require("./reexport-property-module-exports?4").p4).toBe("abc");
});

it("should allow to reexport a reexported exports object (this, exports)", () => {
	expect(require("./reexport-reexport-exports?1").x1.abc).toBe("abc");
	expect(require("./reexport-reexport-exports?2").x2.abc).toBe("abc");
	expect(require("./reexport-reexport-exports?3").x3.abc).toBe("abc");
	expect(require("./reexport-reexport-exports?4").x4.abc).toBe("abc");
});

it("should allow to reexport a reexported exports object (module.exports, object literal)", () => {
	expect(require("./reexport-reexport-module-exports?1").x1.abc).toBe("abc");
	expect(require("./reexport-reexport-module-exports?2").x2.abc).toBe("abc");
	expect(require("./reexport-reexport-module-exports?3").x3.abc).toBe("abc");
	expect(require("./reexport-reexport-module-exports?4").x4.abc).toBe("abc");
});
