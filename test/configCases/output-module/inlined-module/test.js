const fs = require("fs");
const path = require("path");

it("IIFE should present when `avoidEntryIife` is disabled, and avoided when true", () => {
	const trueSource = fs.readFileSync(path.join(__dirname, "module-avoidEntryIife-true.mjs"), "utf-8");
	const falseSource = fs.readFileSync(path.join(__dirname, "module-avoidEntryIife-false.mjs"), "utf-8");
	expect(trueSource).toContain(`This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.`);
	expect(falseSource).not.toMatch(`This entry need to be wrapped in an IIFE`);
});
