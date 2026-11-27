import { x } from "./module";
import "./other";

it("should keep unused string export names inside the comment", () => {
	expect(x).toBe(1);
	expect(globalThis.unusedExportRan).toBe(undefined);
	expect(globalThis.unusedExportsRan).toBe(undefined);
});
