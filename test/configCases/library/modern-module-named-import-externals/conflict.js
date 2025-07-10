// This file creates local variables that conflict with external names
// to test the renaming logic in concatenation

// Import from externals
import { a, b, c } from 'externals0';

// Create local variables with the same names
// This forces the concatenation logic to rename the imports
const localA = "local-a";
const localB = "local-b";
const localC = "local-c";

// Use both local and imported values
export function testConflicts() {
	return {
		importedA: a,
		importedB: b,
		importedC: c,
		localA: localA,
		localB: localB,
		localC: localC
	};
}

// Also create some name conflicts in the same scope
function innerScope() {
	const a = "inner-a";
	const b = "inner-b";
	return { a, b };
}

export const innerResult = innerScope();