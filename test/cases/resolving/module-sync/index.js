import wpImportSyncOnly from "module-sync-only";
const wpRequireSyncOnly = require("module-sync-only");

import wpImportSyncFirst from "module-sync-first";
const wpRequireSyncFirst = require("module-sync-first");

import wpImportFirst from "import-require-first";
const wpRequireFirst = require("import-require-first");

// Expected values mirror Node.js v22.10+ behavior:
//   - "module-sync" is in the active condition set for both require() and
//     dynamic import().
//   - The first matching key in package.json's "exports" object wins, so
//     condition order in package.json is what decides which file is picked.

// Package exports `{ "module-sync": "...", "default": "..." }` — Node.js
// matches "module-sync" for both require() and import() before falling
// through to "default".
it("should resolve module-sync as fallback when import/require are absent", () => {
	expect(wpImportSyncOnly).toBe("module-sync");
	expect(wpRequireSyncOnly).toBe("module-sync");
});

// Package lists "module-sync" before "import"/"require" in exports —
// "module-sync" matches first and wins for both require() and import().
it("should prefer module-sync when listed before import/require in package.json", () => {
	expect(wpImportSyncFirst).toBe("module-sync");
	expect(wpRequireSyncFirst).toBe("module-sync");
});

// Package lists "import"/"require" before "module-sync" — those match first,
// so "module-sync" is never reached for either context.
it("should still honor import/require when they are listed before module-sync", () => {
	expect(wpImportFirst).toBe("import");
	expect(wpRequireFirst).toBe("require");
});
