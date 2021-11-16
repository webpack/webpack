import fs from "fs";

it("should load chunks on demand", async () => {
	expect((await import("./async")).default).toEqual(42);
	expect((await (await import("./async")).nested()).default).toEqual(43);
	expect(fs.readFileSync(__filename, "utf-8")).not.toContain(
		"This is the" + " async chunk"
	);
	expect(fs.readFileSync(__filename, "utf-8")).not.toContain(
		"This is the" + " nested async chunk"
	);
});
