import value, { exception } from "./module";

it("should have a TDZ for exported const values", () => {
	// TODO: support disabling the inline export annotation to keep the TDZ, so this
	// can assert `exception` is an Error matching
	/ is not defined$|^Cannot access '.+?' before initialization$/.
	expect(value).toBe("value");
});
