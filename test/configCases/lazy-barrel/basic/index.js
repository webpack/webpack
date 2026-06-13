import { a, local, na } from "./pkg";
import { fromSecond } from "./second";

it("should provide the requested re-exports", () => {
	expect(a).toBe("a");
	expect(local).toBe(42);
	expect(na).toBe("a");
	expect(fromSecond).toBe("c");
});

it("should not build unused re-export targets", () => {
	const names = __STATS__.modules.map((m) => m.name);
	const has = (file) => names.some((name) => name.endsWith(file));
	expect(has("pkg/a.js")).toBe(true);
	expect(has("pkg/c.js")).toBe(true);
	expect(has("pkg/nested.js")).toBe(true);
	expect(has("pkg/b.js")).toBe(false);
	expect(has("pkg/star.js")).toBe(false);
});
