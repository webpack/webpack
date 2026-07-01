import { local } from "./pkg";

const built = (file) =>
	STATS_JSON.modules.some((m) => m.name.endsWith(file));

it("should provide the requested re-export with unsafe cache", () => {
	expect(local).toBe("local");
});

it("should not build the nested barrel or its targets initially", () => {
	expect(built("pkg/a.js")).toBe(false);
	expect(built("pkg/sub/index.js")).toBe(false);
	expect(built("pkg/sub/b.js")).toBe(false);
	expect(built("pkg/sub/c.js")).toBe(false);
});
