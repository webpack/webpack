import esmDefault, { namedExport as esmNamed } from "esm-ext";
import cjsDefault, { namedExport as cjsNamed } from "cjs-ext";
import plainDefault, { namedExport as plainNamed } from "plain-ext";

it("should unbox the default export when interop is 'esModule'", () => {
	expect(esmDefault).toBe("the default");
	expect(esmNamed).toBe(42);
});

it("should keep the whole exports as default when interop is 'default'", () => {
	expect(cjsDefault).toEqual({
		__esModule: true,
		default: "the default",
		namedExport: 42
	});
	expect(cjsNamed).toBe(42);
});

it("should keep the whole exports as default for a non-flagged external", () => {
	expect(plainDefault).toEqual({
		__esModule: true,
		default: "the default",
		namedExport: 42
	});
	expect(plainNamed).toBe(42);
});
