import fs from "fs";
import path from "path";

const load = () =>
	Promise.all([
		import(/* webpackChunkName: "flat" */ "./flat"),
		import(/* webpackChunkName: "nested/deep" */ "./nested/deep")
	]);

it("should give each depth its own path to the chunk they share", async () => {
	const [flat, deep] = await load();
	expect(await flat.load()).toBe("async");
	expect(await deep.load()).toBe("async");

	const dir = __STATS__.outputPath;
	const nameOf = (prefix) =>
		__STATS__.assets.find((asset) => asset.name.startsWith(prefix)).name;
	const shared = nameOf("async");
	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");

	// One copy sits at the output root and the other a directory down, so the same
	// chunk is reached by two different literals.
	expect(read(nameOf("flat."))).toContain(`"./${shared}"`);
	expect(read(nameOf("nested/deep."))).toContain(`"../${shared}"`);
});
