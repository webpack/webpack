import stable from "./stable";
import value from "./value";

it("should update changed modules while retaining unchanged connections", () => {
	expect(stable).toBe(42);
	expect(value).toBe(Number(WATCH_STEP) + 1);
});
