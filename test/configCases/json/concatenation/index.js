import data from "./data.json";
import { value, name } from "./data.json";
import array from "./array.json";

it("should concatenate JSON modules imported as default", () => {
	expect(data.value).toBe(42);
	expect(data.name).toBe("json-module");
	expect(data.nested.inner).toBe("deep");
});

it("should concatenate JSON modules with named exports", () => {
	expect(value).toBe(42);
	expect(name).toBe("json-module");
});

it("should concatenate JSON array modules", () => {
	expect(array).toEqual([1, 2, 3, 4, 5]);
});

it("should fold every JSON module into a single concatenated module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + data.json + array.json = 3
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(3);
});
