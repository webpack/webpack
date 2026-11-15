import values from "./user.js";

it("should follow export usage that changes while the providing modules do not", () => {
	expect(values).toEqual(
		WATCH_STEP === "0"
			? ["a", "c"]
			: WATCH_STEP === "1"
				? ["b", "d"]
				: ["a", "b", "c", "d"]
	);
});

it("should not rebuild the providing modules", () => {
	for (const stats of STATS_JSON.children) {
		for (const name of ["./lib.js", "./star-lib.js", "./barrel.js"]) {
			const module = stats.modules.find((module) => module.name === name);
			expect(module.built).toBe(WATCH_STEP === "0");
		}
	}
});
