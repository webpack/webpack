import wpImportSyncOnly from "module-sync-only";
const wpRequireSyncOnly = require("module-sync-only");

import wpImportSyncFirst from "module-sync-first";
const wpRequireSyncFirst = require("module-sync-first");

import wpImportFirst from "import-require-first";
const wpRequireFirst = require("import-require-first");

it("should resolve module-sync as fallback when import/require are absent", () => {
	expect(wpImportSyncOnly).toBe("module-sync");
	expect(wpRequireSyncOnly).toBe("module-sync");
});

it("should match Node.js require behavior for module-sync-only", () => {
	expect(wpRequireSyncOnly).toBe(nodeRequireResults["module-sync-only"]);
});

it("should match Node.js import behavior for module-sync-only", () => {
	expect(wpImportSyncOnly).toBe(nodeImportResults["module-sync-only"]);
});

it("should prefer module-sync when listed before import/require in package.json", () => {
	expect(wpImportSyncFirst).toBe("module-sync");
	expect(wpRequireSyncFirst).toBe("module-sync");
});

it("should match Node.js require behavior for module-sync-first", () => {
	expect(wpRequireSyncFirst).toBe(nodeRequireResults["module-sync-first"]);
});

it("should match Node.js import behavior for module-sync-first", () => {
	expect(wpImportSyncFirst).toBe(nodeImportResults["module-sync-first"]);
});

it("should still honor import/require when they are listed before module-sync", () => {
	expect(wpImportFirst).toBe("import");
	expect(wpRequireFirst).toBe("require");
});

it("should match Node.js require behavior for import-require-first", () => {
	expect(wpRequireFirst).toBe(nodeRequireResults["import-require-first"]);
});

it("should match Node.js import behavior for import-require-first", () => {
	expect(wpImportFirst).toBe(nodeImportResults["import-require-first"]);
});
