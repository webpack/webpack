// This module uses external modules in a way that includes them in concatenation
import { named1, named2 } from "external_esm";
import { usedExport } from "external_partially_unused";

// Re-export external modules to force them into concatenation
export { named1, named2 } from "external_esm";
export { usedExport } from "external_partially_unused";

// Use the imports to ensure they're not tree-shaken
export function useExternalsInConcat() {
	return {
		n1: named1,
		n2: named2,
		used: usedExport
	};
}