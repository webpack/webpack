import automatic, { namespaceKeys as automaticKeys } from "./automatic.js";
import strict, { namespaceKeys as strictKeys } from "./strict.mjs";

it("should update default imports when the effective exports type changes", () => {
	expect(automatic).toEqual(
		WATCH_STEP === "1" || WATCH_STEP === "2"
			? "changed"
			: { default: "changed" }
	);
	expect(strict).toEqual(
		WATCH_STEP === "1" ? "changed" : { default: "changed" }
	);
});

it("should update namespace imports when only defaultObject changes", () => {
	expect(automaticKeys).toEqual(["default", "named"]);
	expect(strictKeys).toEqual(
		WATCH_STEP === "0" || WATCH_STEP === "4"
			? ["default", "named"]
			: ["default"]
	);
});

it("should reuse code when the effective exports type stays the same", () => {
	for (const stats of STATS_JSON.children) {
		for (const name of [
			"./automatic.js",
			"./strict.mjs",
			"./target.js",
			"./default-target.js"
		]) {
			const module = stats.modules.find((module) => module.name === name);
			expect(module.built).toBe(WATCH_STEP === "0");
		}
		const automatic = stats.modules.find(
			(module) => module.name === "./automatic.js"
		);
		const strict = stats.modules.find(
			(module) => module.name === "./strict.mjs"
		);
		expect(automatic.codeGenerated).toBe(
			WATCH_STEP !== "2" && WATCH_STEP !== "4"
		);
		expect(strict.codeGenerated).toBe(WATCH_STEP !== "3");
	}
});
