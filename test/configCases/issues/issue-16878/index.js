import fs from "fs";

it("should not try to resolve directories in new URL()", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	const missingModuleMarker = "webpack" + "MissingModule";
	try {
		expect(source).toMatch(/new URL\("\.\/subdir\/",/);
		expect(source).toMatch(/new URL\("\.\/",/);
		expect(source).toMatch(/new URL\("\.",/);
		expect(source).toMatch(/new URL\("\.\.",/);
		expect(source).not.toContain(missingModuleMarker);
	} catch (e) {
		console.log("Generated Source:\n" + source);
		throw e;
	}
});

console.log(new URL("./subdir/", import.meta.url).href);
console.log(new URL("./", import.meta.url).href);
console.log(new URL(".", import.meta.url).href);
console.log(new URL("..", import.meta.url).href);
