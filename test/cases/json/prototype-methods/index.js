import data1 from "./array.json?1";
import data2 from "./array.json?2";

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
