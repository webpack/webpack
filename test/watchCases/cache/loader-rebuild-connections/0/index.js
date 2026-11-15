import { value } from "./target.js";

it("should not accumulate connections when a loader module rebuilds", () => {
	expect(value).toBe(+WATCH_STEP);
});
