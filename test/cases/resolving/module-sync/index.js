import sync1 from "module-sync-only";
const sync2 = require("module-sync-only");

import sync3 from "module-sync-first";
const sync4 = require("module-sync-first");

import imp1 from "import-require-first";
const req1 = require("import-require-first");

it("should resolve module-sync as fallback when import/require are absent", () => {
	expect(sync1).toBe("module-sync");
	expect(sync2).toBe("module-sync");
});

it("should prefer module-sync when listed before import/require in package.json", () => {
	expect(sync3).toBe("module-sync");
	expect(sync4).toBe("module-sync");
});

it("should still honor import/require when they are listed before module-sync", () => {
	expect(imp1).toBe("import");
	expect(req1).toBe("require");
});
