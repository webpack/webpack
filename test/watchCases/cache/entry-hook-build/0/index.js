import obsolete from "./obsolete";
import value from "./value";

it("should build the initial entry before its hooks", () => {
	expect(obsolete).toBe(17);
	expect(value).toBe(WATCH_STEP);
});
