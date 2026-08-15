import fs from "fs";
import path from "path";

// Never awaited: `fetch` cannot reach a relative public path from the test harness.
export const load = () =>
	import(/* webpackChunkName: "shared-lazy" */ "./shared-lazy");

it("should keep the runtime form for the binary both runtimes reach", () => {
	const source = fs.readFileSync(
		path.join(
			__STATS__.children[__INDEX__].outputPath,
			`${__NAME__}-shared-lazy.mjs`
		),
		"utf8"
	);

	expect(source).toContain(__RUNTIME_FORM__);
});
