import fs from "fs";
import path from "path";

// Never awaited: `fetch` cannot reach a relative public path from the test harness.
export const load = () => import(/* webpackChunkName: "web-lazy" */ "./web-lazy");

it("should bake the binary of a runtime that only fetches", () => {
	const source = fs.readFileSync(
		path.join(
			__STATS__.children[__INDEX__].outputPath,
			`${__NAME__}-web-lazy.mjs`
		),
		"utf8"
	);

	expect(source).toContain(__BAKED__);
});
