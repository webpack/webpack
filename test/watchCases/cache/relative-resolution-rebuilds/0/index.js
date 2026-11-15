import { value } from "./value.js";

it("should update modules without missing resolution probes", () => {
	expect(value).toBe(WATCH_STEP);
});
