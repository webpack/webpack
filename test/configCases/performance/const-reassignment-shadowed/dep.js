const frozen = 1;

export function scoped(frozen) {
	frozen = 2;

	return frozen;
}

export default frozen;
