import { answer, pretendAsmSoa, shapeOf } from "./shapes";
import { flagged } from "./shapes2";
import { bounded } from "./shapes3";
import { count, dropped, picked, walkedLeft, walkedTest } from "./const-fold";
import { pretendAsm } from "./object-path";

it("should classify top-level statement shapes in the side-effects scan", () => {
	expect(answer).toBe(42);
	expect(shapeOf()).toBeDefined();
	// calling would make V8 validate (and warn about) the pretend asm.js
	expect(typeof pretendAsmSoa).toBe("function");
	expect(flagged).toBe(true);
	expect(bounded).toBe(true);
});

it("should keep side-effectful heads when folding const branches", () => {
	expect(picked).toBe("yes");
	expect(dropped).toBe(false);
	expect(count).toBe(2);
	expect(walkedTest).toBe("yes");
	expect(walkedLeft).toBe("right");
});

it("should run the object-path taps for pinned parses", () => {
	expect(typeof pretendAsm).toBe("function");
});
