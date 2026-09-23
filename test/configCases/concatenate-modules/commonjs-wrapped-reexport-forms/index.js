import { barrel, checkedDynV } from "./consumer.js";

it("should re-export the bindings of a wrapped ESM module live", () => {
	expect(barrel.esmValue).toBe("esm");
	expect(barrel.count).toBe(0);
	expect(barrel.bump()).toBe(1);
	expect(barrel.count).toBe(1);
});

it("should re-export the namespace of a wrapped ESM module", () => {
	expect(barrel.esmNs.value).toBe("esm");
	expect(Object.keys(barrel.esmNs).sort()).toEqual(["bump", "count", "value"]);
});

it("should star re-export a wrapped ESM module", () => {
	expect(barrel.starA).toBe("star-a");
	expect(barrel.starB).toBe("star-b");
});

it("should re-export the namespace of a wrapped dynamic CommonJS module", () => {
	expect(barrel.dynNs.dynV).toBe("dynamic");
});

it("should star re-export a wrapped dynamic CommonJS module at runtime", () => {
	// unknown usage keeps the whole star, a named read narrows it to a check
	expect(barrel.dynV).toBe("dynamic");
	expect(checkedDynV).toBe("dynamic");
});

it("should re-export the default of a wrapped json module", () => {
	expect(barrel.jsonDefault).toEqual({ a: 1 });
});

it("should re-export the default of a wrapped html module", () => {
	expect(barrel.htmlDefault).toMatch("wrapped page");
});

it("should expose every re-export as an own key of the wrapped barrel", () => {
	expect(Object.keys(barrel).sort()).toEqual([
		"bump",
		"count",
		"dynNs",
		"dynV",
		"esmNs",
		"esmValue",
		"htmlDefault",
		"jsonDefault",
		"starA",
		"starB"
	]);
});

it("should concatenate every module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./barrel.js",
		"./checked-barrel.js",
		"./consumer.js",
		"./data.json",
		"./dynamic-cjs.js",
		"./esm-member.js",
		"./esm-star.js",
		"./index.js",
		"./page.html"
	]);
});
