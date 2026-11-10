function x() {
	let value;
	(() => {
		value = this;
	})();
	return value;
}

it("this-in-arrow-iife: should parse this in an arrow IIFE correctly", () => {
	const o = { ok: true };
	expect(x.call(o)).toBe(o);
});

export {};
