import fs from "fs";
import path from "path";

// Never awaited: `fetch` cannot reach a relative public path from the test harness.
export const load = () =>
	import(/* webpackChunkName: "multi-lazy" */ "./multi-lazy");

// Both entries reach this one chunk and both fetch, so the group is keyed by two
// runtime keys and every one of them has to answer before the url is baked.
it("should bake for a shared chunk every runtime fetches", () => {
	const source = fs.readFileSync(
		path.join(
			__STATS__.children[__INDEX__].outputPath,
			`${__NAME__}-multi-lazy.mjs`
		),
		"utf8"
	);

	expect(source).toContain(__BAKED__);
});
