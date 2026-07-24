import { answer, pretendAsmSoa, shapeOf } from "./shapes";
import { flagged } from "./shapes2";
import { bounded } from "./shapes3";
import { count, dropped, picked, walkedLeft, walkedTest } from "./const-fold";
import { pretendAsm } from "./object-path";

it("should classify top-level statement shapes in the side-effects scan", () => {
	expect(answer).toBe(42);
	expect(shapeOf()).toBeDefined();
	expect(pretendAsmSoa(1)).toBe(3);
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
	expect(pretendAsm(1)).toBe(3);
});
