import {
	b,
	_2
} from "./path2";
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
import { addFiles, isSame } from "./helper";

// should be the same as 2.js and reuse defaultVendors
it("should use only current entrypoint exports", () => {
	expect(b).toBe("b");
	expect(_2.f).toBe("f");
	expect(aUsed).toBe(false);
	expect(bUsed).toBe(true);
	expect(cUsed).toBe(false);
	expect(dUsed).toBe(false);
	expect(eUsed).toBe(false);
	expect(fUsed).toBe(true);

	const files = new Set();

	addFiles(
		files,
		__STATS__.chunks.filter(ch => isSame(ch.runtime, ["c"]))
	);
	addFiles(
		files,
		__STATS__.chunks.filter(ch => isSame(ch.runtime, ["b", "c"]))
	);

	expect(files.size).toBe(2);
});
