import fs from "fs";
import path from "path";

const load = () => ({
	flat: import(/* webpackChunkName: "flat" */ "./flat"),
	deep: import(/* webpackChunkName: "nested/deep" */ "./deep")
});

// Needle built at runtime so it is not a source string literal here.
const wrapper = `${"module"}.exports = ${"__webpack_require__"}.p + `;

it("should resolve the asset whichever form the reference takes", async () => {
	const { flat, deep } = load();
	expect(fs.readFileSync((await flat).url, "utf8")).toContain(
		"the asset content"
	);
	expect(fs.readFileSync((await deep).url, "utf8")).toContain(
		"the asset content"
	);
});

it("should emit no wrapper for an asset every consumer names itself", () => {
	const dir = __STATS__.outputPath;
	const read = (prefix) =>
		fs.readFileSync(
			path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith(prefix))),
			"utf8"
		);

	for (const source of [read("bundle0"), read("flat.")]) {
		expect(source).not.toContain(wrapper);
	}
	// The reference this one cannot bake concatenates the same thing inline instead.
	expect(read("flat.")).toContain(
		`/* asset import */ ${"__webpack_require__"}.p + "asset.txt"`
	);
});
