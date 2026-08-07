import fs from "fs";
import path from "path";

it("should dedupe a shared chunk loaded through the analyzable import", async () => {
	// `one` is requested from two sites concurrently and `vendor` is shared by both
	// chunks; each must still be installed and evaluated exactly once.
	const [a, b, c] = await Promise.all([
		import("./one"),
		import("./one"),
		import("./two")
	]);

	expect(a.value).toBe("one:vendor");
	expect(b.value).toBe("one:vendor");
	expect(c.value).toBe("two:vendor");
	expect(a).toBe(b);
	expect(global.__vendorEvaluations).toBe(1);
});

it("should emit the analyzable literal for the shared chunks", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);
	// Needles are built at runtime so they are not source string literals here.
	const helper = `${"__webpack_require__"}.ei(`;
	const runtimeForm = `${"__webpack_require__"}.e(`;

	expect(bundle).toContain(`${helper}"one_js"`);
	expect(bundle).toContain(`${helper}"vendor"`);
	expect(bundle).toContain('import("./one_js.mjs")');
	expect(bundle).toContain('import("./vendor.mjs")');
	// Nothing falls back to the runtime chunk loader.
	expect(bundle).not.toContain(runtimeForm);
});
