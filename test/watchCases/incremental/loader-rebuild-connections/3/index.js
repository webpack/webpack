import { value } from "./target.js";
// step 3 changes the importer too
it("should not accumulate connections when a loader module rebuilds", () => {
	expect(value).toBe(+WATCH_STEP);
});
