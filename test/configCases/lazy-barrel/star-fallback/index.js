import { s } from "./pkg";

it("should resolve names provided by star re-exports via the fallback", () => {
	expect(s).toBe("s");
});

it("should build all star targets but no unused named re-exports", () => {
	const names = __STATS__.modules.map((m) => m.name);
	const has = (file) => names.some((name) => name.endsWith(file));
	expect(has("pkg/star-a.js")).toBe(true);
	expect(has("pkg/star-b.js")).toBe(true);
	expect(has("pkg/x.js")).toBe(false);
});
