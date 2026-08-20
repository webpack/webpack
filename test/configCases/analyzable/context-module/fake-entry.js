import fs from "fs";
import path from "path";

const load = (name) => import(`./fake/${name}.js`);

it("should load candidates of either exports type", async () => {
	expect((await load("esm")).default).toBe("esm");
	expect((await load("cjs")).default).toBe("cjs");
});

it("should keep the loaders behind the fake-map slot", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	expect(bundle.split(`${"__webpack_require__"}.ei(`)).toHaveLength(3);
	// The exports type sits at 1, so the loaders moved one along.
	expect(bundle).toContain("return ids[2][0]()");
	expect(bundle).not.toContain(`${"__webpack_require__"}.e =`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
