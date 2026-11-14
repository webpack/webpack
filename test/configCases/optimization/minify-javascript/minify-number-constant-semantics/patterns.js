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
