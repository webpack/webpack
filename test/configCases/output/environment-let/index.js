const fs = require("fs");

it(`should emit appropriate variable declarations ${__filename}`, () => {
	const content = fs.readFileSync(__filename, "utf-8");

	if (/bundle0\.js$/.test(__filename)) {
		// const + let supported -> use const for module cache binding
		expect(content).toMatch(/\bconst\s+__webpack_module_cache__\s*=/);
	} else if (/bundle1\.js$/.test(__filename)) {
		// only let supported -> use let for module cache binding
		expect(content).toMatch(/\blet\s+__webpack_module_cache__\s*=/);
		expect(content).not.toMatch(/\bconst\s+__webpack_module_cache__\s*=/);
	} else if (/bundle2\.js$/.test(__filename)) {
		// neither supported -> fall back to var
		expect(content).toMatch(/\bvar\s+__webpack_module_cache__\s*=/);
		expect(content).not.toMatch(
			/\b(?:const|let)\s+__webpack_module_cache__\s*=/
		);
	}
});
