import { namedExport1, namedExport2 } from "external_esm";
import * as namespace from "external_esm";
import defaultExport from "external_esm";

// Partial imports trigger export analysis
import { unusedExport1, unusedExport2, usedExport } from "external_unused";

// Import module but don't use any exports (should result in getUsedExports returning false)
import "external_never_used";

import { nested } from "external_nested";

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

// Export selective export functions
export {
	useSelectiveExports,
	getUnusedNamespace
} from "./selective-export";

// Export array exports functions
export {
	useArrayExports,
	nestedReexport
} from "./array-exports";

// Trigger concatenation
import "./lib1";
import "./lib2";