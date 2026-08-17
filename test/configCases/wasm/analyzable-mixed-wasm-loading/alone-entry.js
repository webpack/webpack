import fs from "fs";
import path from "path";

it("should reach a binary no other runtime shares", async () => {
	const { run } = await import(
		/* webpackChunkName: "alone-lazy" */ "./alone-lazy"
	);

	expect(run()).toBe(42);
});

it("should bake for a runtime the sharing ones never reach", () => {
	const source = fs.readFileSync(
		path.join(
			__STATS__.children[__INDEX__].outputPath,
			`${__NAME__}-alone-lazy.mjs`
		),
		"utf8"
	);

	expect(source).toContain(__BAKED__);
});
