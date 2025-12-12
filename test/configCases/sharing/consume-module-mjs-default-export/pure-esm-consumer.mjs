import something from "shared-esm-pkg";
import { namedExport } from "shared-esm-pkg";

export function testDefaultImport() {
	return {
		defaultType: typeof something,
		defaultValue: typeof something === "function" ? something() : something,
		namedExportValue: namedExport
	};
}
