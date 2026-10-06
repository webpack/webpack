import { foo } from "./pkg";

const built = (file) => STATS_JSON.modules.some((m) => m.name.endsWith(file));

// pkg is not rebuilt, so its dependencies still carry the previous build's lazy flags
it("should build the import a newly requested local export needs", () => {
	expect(foo).toBe("x");
	expect(built("pkg/x.js")).toBe(true);
});

it("should defer the re-export no longer requested", () => {
	expect(built("pkg/a.js")).toBe(false);
});
