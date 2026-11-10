function donotcallme() {
	expect("asi unsafe call happened").toBe(false);
}

it("should not read shadowing bindings of the globals", function () {
	(function (undefined, NaN, Infinity) {
		expect(UNDEFINED).toBe(void 0);
		expect(Number.isNaN(NAN)).toBe(true);
		expect(POSITIVE_INFINITY).toBe(1 / 0);
		expect(NEGATIVE_INFINITY).toBe(-1 / 0);
		expect(1 / POSITIVE_INFINITY).toBe(0);
		expect(OBJECT.value).toBe(void 0);
		expect(Number.isNaN(OBJECT.list[0])).toBe(true);
		expect(OBJECT.list[1]).toBe(1 / 0);
		expect(OBJECT.missing).toBe(void 0);
		expect(() => OBJECT.missing.deep).toThrow(TypeError);
		expect(OBJECT.missing?.deep).toBe(void 0);
		expect(OBJECT.missing?.call(42)).toBe(void 0);
		expect(import.meta.env.MISSING).toBe(void 0);
	})(42, 43, 44);
});

it("should keep property access and evaluation working", function () {
	expect(NAN.toString()).toBe("NaN");
	expect(POSITIVE_INFINITY.toString()).toBe("Infinity");
	expect(typeof UNDEFINED).toBe("undefined");
	expect(typeof NAN).toBe("number");
	if (UNDEFINED !== void 0) require("fail");
});

it("should be ASI safe", function () {
	(donotcallme)
	UNDEFINED;
	(donotcallme)
	NAN;
	(donotcallme)
	POSITIVE_INFINITY;
	(donotcallme)
	OBJECT.missing;
	(donotcallme)
	import.meta.env.MISSING;
});
