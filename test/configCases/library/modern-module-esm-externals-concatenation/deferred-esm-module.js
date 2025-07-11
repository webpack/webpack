// Test deferred ESM external modules specifically
// This ensures the deferred ESM path in ConcatenatedModule is covered

// Deferred import of ESM module
import defer * as esmDeferred from "external_esm";

// Force concatenation
import { internalHelper } from "./lib1";

export function getDeferredESM() {
	// This triggers the deferred ESM module code path
	return esmDeferred;
}

export function testDeferredESMAccess() {
	// Access properties to ensure deferred loading works
	const module = getDeferredESM();
	return {
		default: module.default,
		named1: module.named1,
		helper: internalHelper()
	};
}