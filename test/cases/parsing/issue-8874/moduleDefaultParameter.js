export default function myFunction() {
	let iifeExecutionCount = 0;

	(function someFunction (recurse, recurseFunction = someFunction) {
		iifeExecutionCount++;

		if (recurse) {
			recurseFunction(false);
		}
	})(true);

	return iifeExecutionCount;
}
