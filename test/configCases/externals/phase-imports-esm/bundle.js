// `module` externals — static phase imports become real native
// `import defer * as …` / `import source … from …` statements.
import defer * as modDeferNs from "ext-mod-defer";
import source modSrcDefault from "ext-mod-source";

// `import` externals — dynamic `import.defer(…)` / `import.source(…)`.
const importDefer = import.defer("ext-import-defer");
const importSource = import.source("ext-import-source");

// `module-import` externals at static sites resolve to the `module` form.
import defer * as miDeferNs from "ext-mi-defer-static";
import source miSrcDefault from "ext-mi-source-static";

// `module-import` externals at dynamic sites resolve to the `import` form.
const miImportDefer = import.defer("ext-mi-defer-dynamic");
const miImportSource = import.source("ext-mi-source-dynamic");

// Side-effect uses so no binding is tree-shaken away.
console.log(
	modDeferNs.x,
	modSrcDefault,
	importDefer,
	importSource,
	miDeferNs.x,
	miSrcDefault,
	miImportDefer,
	miImportSource
);
