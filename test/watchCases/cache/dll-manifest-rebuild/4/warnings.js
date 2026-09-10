"use strict";

// The rebuilt StaticExportsDependency no longer provides `added`; a stale one
// would keep the import silent.
module.exports = [[/export 'added'.+was not found in 'dll\/item'/]];
