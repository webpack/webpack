import {
	e,
	_1
} from "./path1";
import {
	aUsed,
	bUsed,
	cUsed
} from "root1";
import {
	dUsed,
	eUsed,
	fUsed
} from "root2";

it("should use only current entrypoint exports", () => {
	expect(e).toBe("e");
	expect(_1.a).toBe("a");
	expect(_1.c).toBe("c");
	expect(aUsed).toBe(true);
	expect(bUsed).toBe(false);
	expect(cUsed).toBe(true);
	expect(dUsed).toBe(false);
	expect(eUsed).toBe(true);
	expect(fUsed).toBe(false);
});
