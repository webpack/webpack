import { y, xUsed, yUsed } from "./module";
import { y as yRe, xUsed as xUsedRe, yUsed as yUsedRe } from "./reexport";
import importDx from "./dx-importer";

it("should use only one export", () => {
	expect(y).toBe("y");
	expect(yUsed).toBe(true);
	expect(xUsed).toBe(false);
});

it("should use only one export when reexported", () => {
	expect(yRe).toBe("y");
	expect(yUsedRe).toBe(true);
	expect(xUsedRe).toBe(false);
});

it("should optimize shared chunks correctly", async () => {
	const dz = await import("./dz"); // this will contain module only with w, x and z exports
	const dx = await importDx(); // this will contain module with all exports
	const dw = await import("./dw"); // this will contain module only with w, x and z exports
	// As dz was loaded first, we get the module will only w, x and z exports
	const identity = dx.identity;
	expect(dx).toEqual(
		nsObj({
			x: "x",
			wUsed: true,
			xUsed: true,
			yUsed: false,
			zUsed: true,
			identity
		})
	);
	expect(dz).toEqual(
		nsObj({
			z: "z",
			wUsed: true,
			xUsed: true,
			yUsed: false,
			zUsed: true,
			identity
		})
	);
	expect(dw).toEqual(
		nsObj({
			w: "w",
			wUsed: true,
			xUsed: true,
			yUsed: false,
			zUsed: true,
			identity
		})
	);
});
