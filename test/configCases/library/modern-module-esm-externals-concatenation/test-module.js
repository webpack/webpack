import { namedExport1, namedExport2 } from "external_esm";
import * as namespace from "external_esm";
import defaultExport from "external_esm";
import { nested } from "external_nested";

export * as reexportedNamespace from "external_esm";
export { namedExport1, namedExport2 };

export function useImports() {
	return {
		named1: namedExport1,
		named2: namedExport2,
		ns: namespace,
		def: defaultExport,
		nested
	};
}