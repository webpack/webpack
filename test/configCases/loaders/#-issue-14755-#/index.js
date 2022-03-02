import regexp from './#.my';

it("should load regexp correctly", () => {
	expect(regexp.test("1")).toBe(false);
	expect(regexp.test("a")).toBe(true);
});
