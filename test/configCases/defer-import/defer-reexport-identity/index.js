import defer * as direct from "./dep.js";
import { reexported } from "./barrel.js";

it("a deferred namespace re-exported through a side-effect-free barrel keeps its identity", () => {
	// Same deferred module, reached directly and via the barrel: one object.
	expect(direct).toBe(reexported);
	expect(direct.value).toBe(42);
});
