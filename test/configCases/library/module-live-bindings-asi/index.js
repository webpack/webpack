import * as library from "./library.mjs";
import * as evalLibrary from "./library-eval.mjs";

it("should keep a regular expression after a line-break-ended export as a literal", () => {
	expect(globalThis.liveAsiRegExpRan).toBeUndefined();
	expect(library.current).toBeUndefined();
	expect(typeof library.handler).toBe("function");
	library.set(1);
	expect(library.current).toBe(1);
	expect(library.handler).toBe(1);
});

it("should keep a line-break-ended export apart from the next line when mirroring its writes", () => {
	expect(globalThis.liveAsiEvalRegExpRan).toBeUndefined();
	expect(evalLibrary.current).toBeUndefined();
	expect(typeof evalLibrary.handler).toBe("function");
	evalLibrary.set(2);
	expect(evalLibrary.current).toBe(2);
	expect(evalLibrary.handler).toBe(2);
});
