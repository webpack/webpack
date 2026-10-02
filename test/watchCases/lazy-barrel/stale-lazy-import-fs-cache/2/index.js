import { a } from "./pkg";

const built = (file) => STATS_JSON.modules.some((m) => m.name.endsWith(file));

it("should defer the import declaration again once only a re-export is requested", () => {
	expect(a).toBe("a");
	expect(built("pkg/x.js")).toBe(false);
});
