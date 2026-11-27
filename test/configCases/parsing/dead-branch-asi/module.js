// ASI ends each statement after the dead branch, so the next line is a regexp
export var arrow = true ? 1 : () => {}
/1;global.deadBranchAsiArrow = true;1/g;

export function* generator() {
	var value = true ? 2 : yield
	/1;global.deadBranchAsiYield = true;1/g;
	return value;
}

// an em space (U+2003) is whitespace too
export var spaced = true ? 3 : () => {}
 /1;global.deadBranchAsiSpace = true;1/g;
