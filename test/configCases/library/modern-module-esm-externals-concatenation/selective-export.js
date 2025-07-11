// Test selective exports from external modules
import { usedExport } from "external_partially_unused";
import * as totallyUnused from "external_totally_unused";

// Only use specific exports to trigger selective export tracking
export function useSelectiveExports() {
	return {
		used: usedExport
	};
}

// Force namespace object usage to test export tracking
export function getUnusedNamespace() {
	// This should still track that the module is imported
	// but no exports are actually used
	return totallyUnused;
}