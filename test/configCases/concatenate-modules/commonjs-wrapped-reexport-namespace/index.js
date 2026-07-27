import * as consumer from "./consumer";

it("should re-export a fake namespace object from a wrapped module", () => {
	// "default-with-named": the named exports are merged into the namespace
	expect(consumer.namedA).toBe("a-value");
	expect(consumer.wholeDefault).toBe("whole");
	// "default-only": only `default` carries the value
	expect(consumer.textDefault).toBe("text-asset");
});

it("should keep the re-exported namespace object identical across reads", () => {
	expect(consumer.sameNamespace).toBe(true);
});

it("should concatenate the whole re-export chain", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./barrel.js",
		"./consumer.js",
		"./index.js",
		"./named-cjs.js",
		"./source.txt",
		"./whole-cjs.js"
	]);
});
