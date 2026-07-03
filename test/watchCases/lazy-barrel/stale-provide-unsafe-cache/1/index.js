import { a, b } from "./pkg";

const built = (file) =>
	STATS_JSON.modules.some((m) => m.name.endsWith(file));

// requesting `b` resolves the nested barrel from the unsafe cache and must
// un-defer its targets (the _unlazyBarrelForDependency path)
it("should build a newly requested re-export through the unsafe-cached nested barrel", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(built("pkg/sub/index.js")).toBe(true);
	expect(built("pkg/sub/b.js")).toBe(true);
});
