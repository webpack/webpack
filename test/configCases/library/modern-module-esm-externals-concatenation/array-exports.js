// Test array exports from ESM external modules
// This ensures the Array.isArray(exportName) code path is covered

// Import nested property from external module
import { nested } from "external_nested";

// Re-export specific nested paths
export { nested as nestedReexport };

// Function that uses nested exports
export function useArrayExports() {
	// This will trigger export tracking for nested paths
	return {
		directNested: nested,
		nestedValue: nested.value
	};
}