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

	// Both depths, since only their own chunk can carry a wrapper for them.
	const deep = fs.readFileSync(
		path.join(dir, "nested", fs.readdirSync(path.join(dir, "nested"))[0]),
		"utf8"
	);

	for (const source of [read("bundle0"), read("flat."), deep]) {
		expect(source).not.toContain(wrapper);
	}
	// Each depth bakes its own literal, so nothing reads the public path either.
	expect(read("flat.")).toContain('"./asset.txt", import.meta.url');
	expect(deep).toContain('"../asset.txt", import.meta.url');
});
