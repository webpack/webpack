import consumed from "./consumer";
import { __usedExports } from "./dep";

it(`should keep pure deps correct after incremental rebuild (step ${WATCH_STEP})`, () => {
	expect(consumed).toBe(undefined);
	// lib.js is unchanged across steps (cache-restored); only the consumer switches
	// which pure export it uses, so the persisted pure deps must re-drive tree-shaking
	expect(__usedExports.sort()).toEqual(
		WATCH_STEP === "0"
			? ["__usedExports", "a"]
			: ["__usedExports", "b"]
	);
});
