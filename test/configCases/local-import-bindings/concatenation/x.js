export const NAME = "x";

// `eval` keeps this module out of the concatenation its importer joins.
export function evaluate(code) {
	return eval(code);
}
