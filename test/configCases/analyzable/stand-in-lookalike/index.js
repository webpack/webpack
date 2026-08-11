import fs from "fs";
import path from "path";
import { lookalikes } from "./lookalikes";

// A real reference next to them, so the pass definitely ran over this asset.
const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

it("should leave a stand-in it cannot read exactly as written", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(typeof load).toBe("function");
	// The pass ran: the real reference next to these was filled in.
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	for (const [name, text] of Object.entries(lookalikes)) {
		expect([name, bundle.includes(text)]).toEqual([name, true]);
	}
});
