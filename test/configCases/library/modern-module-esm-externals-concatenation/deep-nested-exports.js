// Test deep nested exports to trigger Array.isArray(exportName) path

// Import module with complex nested structure
import complexModule from "external_complex_nested";

// Access deeply nested properties
export function useDeepNestedExports() {
	// This should trigger tracking of nested export paths like ["a", "b", "c"]
	return {
		level1: complexModule.level1,
		level2: complexModule.level1?.level2,
		level3: complexModule.level1?.level2?.level3,
		value: complexModule.level1?.level2?.level3?.value
	};
}

// Re-export nested paths
export const deepValue = complexModule.level1?.level2?.level3?.value;
export const midValue = complexModule.level1?.level2?.data;
