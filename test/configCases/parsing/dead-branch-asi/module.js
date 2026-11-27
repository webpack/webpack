// ASI ends each statement after the dead branch, so the next line is a regexp
export var arrow = true ? 1 : () => {}
/1;globalThis.deadBranchAsiArrow = true;1/g;

export function* generator() {
	var value = true ? 2 : yield
	/1;globalThis.deadBranchAsiYield = true;1/g;
	return value;
}
