const table = { 5: 1, true: 1, undefined: 1 };

it("should keep a replaced import.meta member apart from a following keyword", () => {
	expect(import.meta["webpack"]in table).toBe(true);
});

it("should keep a replaced optional call apart from a following keyword", () => {
	expect(null?.()in table).toBe(true);
});

it("should keep a replaced __webpack_is_included__ apart from a following keyword", () => {
	expect(__webpack_is_included__("./index")in table).toBe(true);
});

it("should keep a replaced export info apart from a following keyword", () => {
	expect(__webpack_exports_info__["x"]["provideInfo"]in table).toBe(true);
});

export const x = 1;
