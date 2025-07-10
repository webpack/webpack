import { namedExport1, namedExport2 } from "external_esm";
import * as namespace from "external_esm";
import defaultExport from "external_esm";

// Partial imports trigger export analysis
import { unusedExport1, unusedExport2, usedExport } from "external_unused";

import { nested } from "external_nested";

// Deferred external
import("external_deferred").then(module => {
	console.log(module);
});

export { namedExport1, namedExport2 } from "external_esm";
export * as reexportedNamespace from "external_esm";

export function useImports() {
	return {
		named1: namedExport1,
		named2: namedExport2,
		ns: namespace,
		def: defaultExport,
		used: usedExport,
		nested: nested
	};
}

// Trigger concatenation
import "./lib1";
import "./lib2";