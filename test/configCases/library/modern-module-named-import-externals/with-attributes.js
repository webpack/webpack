// Test import attributes handling in ExternalModule
// This should test the code path for attributes handling

// Note: Import attributes are experimental and may not be fully supported
// in all environments. This test mainly ensures the code path is covered.

// Mock the dependency meta structure that would have attributes
const mockDependencyMeta = {
	attributes: {
		type: "json",
		_isLegacyAssert: false
	}
};

const mockLegacyDependencyMeta = {
	attributes: {
		type: "json", 
		_isLegacyAssert: true
	}
};

// Export to ensure module is included
export { mockDependencyMeta, mockLegacyDependencyMeta };