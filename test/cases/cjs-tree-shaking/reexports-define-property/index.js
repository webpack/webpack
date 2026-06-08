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

it("should keep executing reexported modules even when unused", () => {
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
