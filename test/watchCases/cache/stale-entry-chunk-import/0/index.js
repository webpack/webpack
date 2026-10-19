import { getValue } from "./lib";

it("should import the current lib chunk from a chunk with the runtime", () => {
	expect(getValue()).toBe(`lib-${WATCH_STEP}`);
	expect(STATS_JSON.errors).toHaveLength(0);
});
