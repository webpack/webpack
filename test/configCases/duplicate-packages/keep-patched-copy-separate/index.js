import { TOKEN as direct } from "singleton-lib";
import { TOKEN as viaWrapper } from "wraps-lib";

it("should not merge same-version copies with different content", () => {
	// a patched copy must stay a separate module, never silently replaced
	expect(direct).not.toBe(viaWrapper);
	expect(direct.patched).toBe(false);
	expect(viaWrapper.patched).toBe(true);
	expect(globalThis.__SINGLETON_COUNT).toBe(2);
});

it("should keep both copies in the module graph", () => {
	const copies = __STATS__.modules.filter((m) =>
		m.name.endsWith("singleton-lib/index.js")
	);
	expect(copies).toHaveLength(2);
});
