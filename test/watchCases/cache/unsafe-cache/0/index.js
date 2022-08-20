import value from "./changing-module";
import "./proxy-module";

it("should compile and cleanup correctly", () => {
	expect(value).toBe(WATCH_STEP);
});
