const fs = require("fs");
const path = require("path");

it("should load a require.ensure block", (done) => {
	require.ensure(
		["./lazy"],
		() => {
			expect(require("./lazy")).toBe("lazy");
			done();
		},
		"ensured"
	);
});

it("should keep the runtime form where the block names no origin", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const ensureChunkCall = `${"__webpack_require__"}.e(`;

	expect(bundle).toContain(ensureChunkCall);
	expect(bundle).not.toContain(`${"__webpack_require__"}.ei(`);
});
