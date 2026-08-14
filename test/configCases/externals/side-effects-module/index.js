import "module-free";
import "module-keep";
import "module-import-free";
import "module-import-keep";

it("should drop a side-effect-free external in an ESM output", () => {
	expect(EVALUATED).not.toContain("module-free");
	expect(EVALUATED).not.toContain("module-import-free");
});

it("should keep an external which may have side effects in an ESM output", () => {
	expect(EVALUATED).toContain("module-keep");
	expect(EVALUATED).toContain("module-import-keep");
});
