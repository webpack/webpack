import { local, c } from "./pkg";

it("should provide a star re-export name newly imported on rebuild", () => {
	expect(local).toBe("local");
	expect(c).toBe("c");
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/sub2/index.js"))
	).toBe(true);
});
