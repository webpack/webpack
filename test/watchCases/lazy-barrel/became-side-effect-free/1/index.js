import { a } from "./pkg";

it("should defer the missing re-export once the barrel is side-effect-free", () => {
	expect(a).toBe("a");
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/missing"))
	).toBe(false);
});
