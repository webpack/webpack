import { a, b } from "./pkg";

it("should build the newly imported re-export target on rebuild", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(STATS_JSON.modules.some((m) => m.name.endsWith("pkg/b.js"))).toBe(
		true
	);
});
