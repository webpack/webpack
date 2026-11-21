import { used } from "./reexporter.js";

it("should evaluate the module of an unused CommonJS re-export", () => {
	expect(used).toBe(1);
	expect(global.unusedCommonJsReexportEvaluated).toBe(true);
	delete global.unusedCommonJsReexportEvaluated;
});
