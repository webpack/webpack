// Test deferred imports with non-ESM external modules
import defer * as commonjsNs from "external_commonjs";

export function testDeferredCommonJsNamespace() {
	// This will trigger deferred namespace object usage for non-ESM externals
	return commonjsNs;
}

// Force usage that requires deferredNamespaceObjectName
export function accessDeferredCommonJs() {
	// Access in a way that requires namespace object materialization
	const keys = Object.keys(testDeferredCommonJsNamespace());
	return keys;
}