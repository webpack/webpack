import { x, xUsed, yUsed } from "./module";
import { x as xRe, xUsed as xUsedRe, yUsed as yUsedRe } from "./reexport";
import importDx from "./dx-importer";

it("should use only one export", () => {
	expect(x).toBe("x");
	expect(xUsed).toBe(true);
	expect(yUsed).toBe(false);
});

it("should use only one export when reexported", () => {
	expect(xRe).toBe("x");
	expect(xUsedRe).toBe(true);
	expect(yUsedRe).toBe(false);
});

it("should optimize shared chunks correctly", async () => {
	const dx = await importDx(); // this will contain module with all exports
	const dy = await import("./dy"); // this will contain module only with w, x and y exports
	const dw = await import("./dw"); // this will contain module only with w, x and y exports
	// As dx was loaded first, we get the module will all exports
	const identity = dx.identity;
	expect(dx).toEqual(
		nsObj({
			x: "x",
			wUsed: true,
			xUsed: true,
			yUsed: true,
			zUsed: true,
			identity
		})
	);
	expect(dy).toEqual(
		nsObj({
			y: "y",
			wUsed: true,
			xUsed: true,
			yUsed: true,
			zUsed: true,
			identity
		})
	);
	expect(dw).toEqual(
		nsObj({
			w: "w",
			wUsed: true,
			xUsed: true,
			yUsed: true,
			zUsed: true,
			identity
		})
	);
});
