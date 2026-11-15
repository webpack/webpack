import defaultUndefined from "./default-undefined";
import defaultNaN from "./default-nan";
import {
	namedUndefined,
	namedNaN,
	negativeZero,
	booleanTrue,
	booleanFalse,
	nullValue,
	numberValue,
	stringValue
} from "./constants";

it("should inline named undefined without capturing a parameter", () => {
	(function (undefined) {
		expect(namedUndefined).toBeUndefined();
	})(42);
});

it("should inline default undefined without capturing a parameter", () => {
	(function (undefined) {
		expect(defaultUndefined).toBeUndefined();
	})(42);
});

it("should inline named NaN without capturing a parameter", () => {
	(function (NaN) {
		expect(namedNaN).toBeNaN();
	})(42);
});

it("should inline default NaN without capturing a parameter", () => {
	(function (NaN) {
		expect(defaultNaN).toBeNaN();
	})(42);
});

it("should preserve inlined values under nested local bindings", () => {
	(function () {
		const undefined = 42;
		const NaN = 43;
		(() => {
			expect(namedUndefined).toBeUndefined();
			expect(defaultUndefined).toBeUndefined();
			expect(namedNaN).toBeNaN();
			expect(defaultNaN).toBeNaN();
		})();
	})();
});

it("should preserve unshadowed primitive exports", () => {
	expect(namedUndefined).toBeUndefined();
	expect(defaultUndefined).toBeUndefined();
	expect(namedNaN).toBeNaN();
	expect(defaultNaN).toBeNaN();
	expect(Object.is(negativeZero, -0)).toBe(true);
	expect(1 / negativeZero).toBe(-Infinity);
	expect(booleanTrue).toBe(true);
	expect(booleanFalse).toBe(false);
	expect(nullValue).toBe(null);
	expect(numberValue).toBe(123456);
	expect(stringValue).toBe("short");
});

it("should parenthesize inlined values before property accesses", () => {
	(function (undefined, NaN) {
		expect(namedNaN.toString()).toBe("NaN");
		expect(defaultNaN.valueOf()).toBeNaN();
		expect(() => namedUndefined.valueOf()).toThrow(TypeError);
		expect(() => defaultUndefined.valueOf()).toThrow(TypeError);
	})(42, 43);
});
