// Static defer phase against a `module` external should be emitted as a
// real native `import defer * as …` statement, the same way import
// attributes are preserved for ESM output.
import defer * as deferNs from "ext-defer";

// Static source phase against a `module` external should be emitted as a
// real native `import source <ident> from …` statement.
import source srcDefault from "ext-source";

// Dynamic phase imports against an `import` external should be emitted as
// `import.defer(…)` and `import.source(…)` calls.
const dynDefer = import.defer("ext-import-defer");
const dynSource = import.source("ext-import-source");

// Side-effect uses so neither static binding is tree-shaken away.
console.log(deferNs.x, srcDefault, dynDefer, dynSource);
