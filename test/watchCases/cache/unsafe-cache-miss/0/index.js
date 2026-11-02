import value from "./changing-module";
import other from "./unchanged-module";

it("should resolve again a dependency the unsafe cache no longer holds", () => {
	expect(value).toBe(WATCH_STEP);
	expect(other).toBe("unchanged");
});
