import { a } from "./pkg";

it("should not build the unused re-export target initially", () => {
	expect(a).toBe("a");
	expect(STATS_JSON.modules.some((m) => m.name.endsWith("pkg/b.js"))).toBe(
		false
	);
});
