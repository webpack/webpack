import { local } from "./parent";

it("should prune the deferred target while retaining its parent", () => {
	expect(local).toBe("local");
	expect(STATS_JSON.modules.some((module) => module.name === "./child.js")).toBe(false);
	expect(STATS_JSON.modules.find((module) => module.name === "./parent.js").built).toBe(false);
});
