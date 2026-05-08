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
	expect(wpRequireSyncOnly).toBe(nodeRequire("module-sync-only"));
});

it("should match Node.js import behavior for module-sync-only", async () => {
	const node = await nodeImport("module-sync-only");
	expect(wpImportSyncOnly).toBe(node.default);
});

it("should prefer module-sync when listed before import/require in package.json", () => {
	expect(wpImportSyncFirst).toBe("module-sync");
	expect(wpRequireSyncFirst).toBe("module-sync");
});

it("should match Node.js require behavior for module-sync-first", () => {
	expect(wpRequireSyncFirst).toBe(nodeRequire("module-sync-first"));
});

it("should match Node.js import behavior for module-sync-first", async () => {
	const node = await nodeImport("module-sync-first");
	expect(wpImportSyncFirst).toBe(node.default);
});

it("should still honor import/require when they are listed before module-sync", () => {
	expect(wpImportFirst).toBe("import");
	expect(wpRequireFirst).toBe("require");
});

it("should match Node.js require behavior for import-require-first", () => {
	expect(wpRequireFirst).toBe(nodeRequire("import-require-first"));
});

it("should match Node.js import behavior for import-require-first", async () => {
	const node = await nodeImport("import-require-first");
	expect(wpImportFirst).toBe(node.default);
});
