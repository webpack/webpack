"use strict";

this.viaThis = "exports";

it("should keep the top level this as the exports object by default", () => {
	expect(this).toBe(module.exports);
	expect(module.exports.viaThis).toBe("exports");
	expect(globalThis.viaThis).toBe(undefined);
});
