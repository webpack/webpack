import { readAdded } from "./reader";

const w1 = require("./wrapped");
const w2 = require("./wrapped");

w1.added = "extra";

it("should return the module's own exports object from require()", () => {
	expect(w1.base).toBe("wrapped");
	expect(w1.f()).toBe("wrapped");
});

it("should return the identical object for repeated require() calls", () => {
	expect(w2).toBe(w1);
	expect(w2.added).toBe("extra");
});

it("should share that object with a require() in another module", () => {
	// ./reader captured the exports object before index.js mutated it
	expect(readAdded()).toBe("extra");
});

it("should concatenate the wrapped module and both of its requirers", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./index.js",
		"./reader.js",
		"./wrapped.js"
	]);
});
