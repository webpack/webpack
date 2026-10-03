import { a } from "./pkg";

const built = (file) => STATS_JSON.modules.some((m) => m.name.endsWith(file));

// only a re-export is requested, so pkg's own `import { x }` is deferred too
it("should defer the barrel's import declaration initially", () => {
	expect(a).toBe("a");
	expect(built("pkg/x.js")).toBe(false);
});
