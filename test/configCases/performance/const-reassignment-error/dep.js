let movable = 3;

movable = 4;

// Never called: the write throws where it runs, and the report is about the
// code being there at all.
export function broken() {
	const frozen = 1;

	frozen = 2;

	return frozen;
}

export default movable;
