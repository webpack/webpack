import { readDeferredValue, requireTarget } from "./consumer";

it("should share evaluation between import defer and require", () => {
	expect(global.__deferRequireWrappedEvaluations).toBeUndefined();

	const required = requireTarget();

	expect(required.value).toBe("target");
	expect(global.__deferRequireWrappedEvaluations).toBe(1);
	expect(readDeferredValue()).toBe("target");
	expect(global.__deferRequireWrappedEvaluations).toBe(1);
});

it("should keep the deferred target outside the concatenation", () => {
	const concatenatedModules = __STATS__.modules.filter((module) => module.modules);

	expect(concatenatedModules.length).toBe(1);
	expect(
		concatenatedModules[0].modules.map((module) => module.name).sort()
	).toEqual(["./consumer.js", "./index.js"]);
});

global.__deferRequireWrappedEvaluations = undefined
