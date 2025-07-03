const fs = require("fs");
const path = require("path");

it("IIFE should present when `avoidEntryIife` is disabled, and avoided when true", () => {
	const trueSource = fs.readFileSync(path.join(__dirname, "module-avoidEntryIife-true.mjs"), "utf-8");
	const falseSource = fs.readFileSync(path.join(__dirname, "module-avoidEntryIife-false.mjs"), "utf-8");
	expect(trueSource).not.toContain('This entry needs to be wrapped in an IIFE');
	expect(falseSource).toContain('This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.');
});
