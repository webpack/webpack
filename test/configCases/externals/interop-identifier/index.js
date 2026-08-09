import esmDefault, { namedExport as esmNamed } from "esm-ext";
import cjsDefault from "cjs-ext";
import plainDefault from "plain-ext";

it("should keep externals differing only in interop apart", () => {
	expect(esmDefault).toBe("the default");
	expect(esmNamed).toBe(42);
	expect(cjsDefault).toEqual({
		__esModule: true,
		default: "the default",
		namedExport: 42
	});
	expect(plainDefault).toEqual(cjsDefault);
});
