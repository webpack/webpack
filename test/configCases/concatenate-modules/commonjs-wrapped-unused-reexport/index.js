import { read } from "./re.js";

it("should resolve a used export through an ESM re-export of a wrapped module", () => {
	expect(read).toBe("read");
});

it("should still evaluate the wrapped module behind an unused re-export", () => {
	expect(global.__reexportOrder).toEqual(["cjs"]);
});

it("should concatenate every module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./cjs.js",
		"./index.js",
		"./re.js"
	]);
	delete global.__reexportOrder;
});
