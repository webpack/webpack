it("should build all re-export targets when required from CommonJS", () => {
	const { a, b, local } = require("./pkg");
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(local).toBe(42);
	const names = __STATS__.modules.map((m) => m.name);
	const has = (file) => names.some((name) => name.endsWith(file));
	expect(has("pkg/a.js")).toBe(true);
	expect(has("pkg/b.js")).toBe(true);
});
