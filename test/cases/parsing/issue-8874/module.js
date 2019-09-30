import someFunction from './someFunction';

export default function myFunction() {
	let iifeExecutionCount = 0;

	(function someFunction (recurse) {
		iifeExecutionCount++;

		if (recurse) {
			someFunction(false);
		}
	})(true);

	return iifeExecutionCount;
}
