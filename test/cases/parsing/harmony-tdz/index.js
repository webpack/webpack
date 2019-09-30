import value, { exception } from "./module";

it("should have a TDZ for exported const values", () => {
	expect(typeof exception).toBe("object");
	expect(exception).toBeInstanceOf(Error);
	expect(exception.message).toMatch(
		/ is not defined$|^Cannot access '.+?' before initialization$/
	);
	expect(value).toBe("value");
});
