import data from "./data.json";

const fs = require("fs");

it(`should emit appropriate variable declarations ${__filename}`, () => {
	expect(data.value).toBe(1);
	const content = fs.readFileSync(__filename, "utf-8");
	// the runtime declares with `var` whatever the environment supports
	expect(content).toMatch(/\bvar\s+__webpack_require__\s*=/);

	if (/bundle0\.js$/.test(__filename)) {
		// const + let supported -> module code uses const
		expect(content).toMatch(/\bconst\s+data_namespaceObject\s*=/);
	} else if (/bundle1\.js$/.test(__filename)) {
		// only let supported -> module code uses let
		expect(content).toMatch(/\blet\s+data_namespaceObject\s*=/);
	} else if (/bundle2\.js$/.test(__filename)) {
		// neither supported -> fall back to var
		expect(content).toMatch(/\bvar\s+data_namespaceObject\s*=/);
	}
});
