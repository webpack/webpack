import fs from "fs";

it(`should have/have not 'node:' prefix ${__filename}`,  () => {
	const content = fs.readFileSync(__filename, "utf-8");

	if (/bundle7\.js$/.test(__filename)) {
		expect(content).toContain("require(\"fs\");");
	} else if (/(bundle1\.mjs|bundle3\.mjs|bundle6\.mjs)$/.test(__filename)) {
		expect(content).toContain("from \"url\"");
		expect(content).toContain("from \"module\"");
	} else {
		expect(content).toContain("from \"node:url\"");
		expect(content).toContain("from \"node:module\"");
	}
});

