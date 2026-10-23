"use strict";

it("should read constants from a reassigned Number global", () => {
	const original = Number;
	let result;
	try {
		Number = { POSITIVE_INFINITY: 7 };
		result = Number.POSITIVE_INFINITY;
	} finally {
		Number = original;
	}
	expect(result).toBe(7);
});

it("should read constants from a Number global assigned by a pattern", () => {
	const original = Number;
	let result;
	try {
		[Number] = [{ POSITIVE_INFINITY: 7 }];
		result = Number.POSITIVE_INFINITY;
	} finally {
		Number = original;
	}
	expect(result).toBe(7);
});
