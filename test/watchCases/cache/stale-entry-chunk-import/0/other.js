import { getValue } from "./lib";

it("should import the current lib chunk from a chunk without the runtime", () => {
	expect(getValue()).toBe(`lib-${WATCH_STEP}`);
});
