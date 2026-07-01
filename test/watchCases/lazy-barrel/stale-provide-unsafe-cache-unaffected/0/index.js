import { local } from "./pkg";
// the direct import builds sub in this step, while pkg's `export * from "./sub"`
// stays deferred — so pkg's provided exports get mem-cached without sub's names
// and sub is "unchanged" (never flagged affected) on the next build
import { b as directB } from "./pkg/sub";

it("should mem-cache the barrel exports while its star target stays deferred", () => {
	expect(local).toBe("local");
	expect(directB).toBe("b");
});
