import { TOKEN as direct } from "singleton-lib";
import { TOKEN as viaWrapper } from "wraps-lib";

it("should share one instance of an identical duplicate package", () => {
	// both installs are byte-identical singleton-lib@1.0.0 at different paths
	expect(direct).toBe(viaWrapper);
	expect(globalThis.__SINGLETON_COUNT).toBe(1);
});

it("should keep only the canonical copy in the module graph", () => {
	const copies = __STATS__.modules.filter((m) =>
		m.name.endsWith("singleton-lib/index.js")
	);
	expect(copies).toHaveLength(1);
	expect(copies[0].name).toBe("./node_modules/singleton-lib/index.js");
});
