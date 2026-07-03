import { local, c, cProvided } from "./pkg";

it("should provide a named re-export newly imported on rebuild", () => {
	expect(local).toBe("local");
	expect(c).toBe("c");
	expect(cProvided).toBe(true);
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/sub2/index.js"))
	).toBe(true);
});
