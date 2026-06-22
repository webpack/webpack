import { a, b, c } from "./pkg";

const built = (file) =>
	STATS_JSON.modules.some((m) => m.name.endsWith(file));

it("should keep the nested re-exports intact on a later rebuild", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(c).toBe("c");
	expect(built("pkg/sub/c.js")).toBe(true);
});
