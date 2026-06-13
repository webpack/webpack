import { a, local } from "./pkg";

it("should provide the requested re-exports in production", () => {
	expect(a).toBe("a");
	expect(local).toBe(42);
});

it("should not build unused re-export targets in production", () => {
	const names = __STATS__.modules.map((m) => m.name);
	const has = (file) => names.some((name) => name.endsWith(file));
	expect(has("pkg/a.js")).toBe(true);
	expect(has("pkg/b.js")).toBe(false);
	expect(has("pkg/star.js")).toBe(false);
});
