import data1 from "./array.json?1";
import data2 from "./array.json?2";
import data4 from "./array.json?4";

it("should allow to call prototype methods", () => {
	expect(data1.map(d => d * 2)).toEqual([2, 2, 4, 6, 10]);
	expect(data2.map(d => d * 2)).toEqual([2, 2, 4, 6, 10]);
	expect(require("./array.json?2").map(d => d * 2)).toEqual([2, 2, 4, 6, 10]);
	expect(require("./array.json?3").map(d => d * 2)).toEqual([2, 2, 4, 6, 10]);
	try {
		Object.prototype.smoosh = function () {
			return this.map(d => d + 1);
		};
		expect(data1.smoosh()).toEqual([2, 2, 3, 4, 6]);
		expect(data2.smoosh()).toEqual([2, 2, 3, 4, 6]);
		expect(require("./array.json?2").smoosh()).toEqual([2, 2, 3, 4, 6]);
		expect(require("./array.json?3").smoosh()).toEqual([2, 2, 3, 4, 6]);
	} finally {
		delete Object.prototype.smoosh;
	}
});

it("should allow to read prototype properties", () => {
	// plain member reads only: `Array.isArray(…)` would reference the whole
	// value and hide the collapse to `{ length: 5 }`
	expect(data4.length).toBe(5);
	expect(data4.constructor).toBe(Array);
	expect(require("./array.json?5").length).toBe(5);
	expect(require("./array.json?5").constructor).toBe(Array);
});
