import fs, { readFile } from "module-node-fs";

it("should allow async externals", async () => {
	const { default: fs1, readFile: readFile1 } = await import("fs");
	const fs2 = (await import("node:fs")).default;
	const fs3 = (await import("import-node-fs")).default;
	const path = await import("import-node-path");
	const data = fs.readFileSync(__STATS__.outputPath + "/bundle0.mjs", "utf-8");

	expect(data.includes("import * as __WEBPACK_EXTERNAL_MODULE_fs__ from \"fs\";")).toBe(true);
	expect(data.includes("import(\"node:fs\");")).toBe(true);

	expect(readFile).toStrictEqual(readFile1);
	expect(readFile1).toStrictEqual(fs2.readFile);
	expect(readFile1).toStrictEqual(fs3.readFile);
	expect(fs).toStrictEqual(fs2);
	expect(fs1).toStrictEqual(fs2);
	expect(fs1).toStrictEqual(fs3);
	expect(fs.readFile).toStrictEqual(fs2.readFile);
	expect(fs.readFile).toStrictEqual(fs3.readFile);
	expect(fs1.readFile).toStrictEqual(fs2.readFile);
	expect(fs1.readFile).toStrictEqual(fs3.readFile);
	expect(typeof path.join).toBe("function")
});
