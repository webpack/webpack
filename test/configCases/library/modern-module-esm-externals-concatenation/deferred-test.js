// Test deferred imports with concatenation
import defer * as ns from "external_esm";
import defer * as ns2 from "external_esm";
import defer * as ns3 from "external_esm";

export function testDeferredNamespace() {
	// This will trigger deferred namespace object usage
	return ns;
}

export function testDeferredNamed() {
	// This will trigger deferred named imports through namespace
	return { named1: ns2.named1, named2: ns2.named2 };
}

export function testDeferredDefault() {
	// This will trigger deferred default import through namespace
	return ns3.default;
}

// Force evaluation to test the deferred behavior
export function evaluateDeferred() {
	const namespace = testDeferredNamespace();
	const named = testDeferredNamed();
	const def = testDeferredDefault();
	
	return {
		ns: namespace,
		named: named,
		def: def
	};
}