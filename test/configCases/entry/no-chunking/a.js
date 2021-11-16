import fs from "fs";
import path from "path";

it("should load chunks on demand", async () => {
	expect((await import("./async")).default).toEqual(42);
	expect((await (await import("./async")).nested()).default).toEqual(43);
	expect(fs.readFileSync(path.join(__output_dirname__, 'a.js'), "utf-8")).not.toContain(
		"This is the" + " async chunk"
	);
	expect(fs.readFileSync(path.join(__output_dirname__, 'a.js'), "utf-8")).not.toContain(
		"This is the" + " nested async chunk"
	);
});
