import { foo } from "./barrel.js";

it("should keep the local export", () =>
	import("./later.js").then(({ bar }) => {
		expect(foo).toBe("local");
		expect(bar).toBe("bar");
	}));

it("should not forward a barrel's local export to its star re-export target", () => {
	expect(BUILD_REPORT.modules.includes("heavy.js")).toBe(
		!BUILD_REPORT.sideEffects
	);
});
