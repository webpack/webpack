import { value } from "./branch";
import { stable } from "./stable";

// A detached file changes in the step that detaches it, while still watched:
// one the last build did not watch may report its change after the next starts.

it("should read a restored file after its module was detached", () => {
	expect(value).toBe(Number(WATCH_STEP) + 1);
	expect(stable).toBe(10);
});
