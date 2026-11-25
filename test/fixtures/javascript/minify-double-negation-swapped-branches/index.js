// Both negations go where the test is read for its truth, so the comparison
// prints bare: the `!` swapping the branches flips it back.
function equality(left, right) {
	if (!!(left == right)) {
		1;
	} else {
		return "different";
	}
}

function strictEquality(left, right) {
	if (!!(left === right)) return;
	return "different";
}

function inequality(left, right) {
	if (!!(left != right)) {
		1;
	} else {
		return "equal";
	}
}

function strictInequality(left, right) {
	if (!!(left !== right)) return;
	return "equal";
}

let updates = 0;

// The branch kept after the swap runs on the other side.
function counted(left, right) {
	if (!!(left == right)) {
		updates++;
	} else {
		return "kept";
	}
}

// Not an equality, the comparison keeps the parentheses its `!` needs back.
function ordering(left, right) {
	if (!!(left < right)) return;
	return "not less";
}

function sum(left, right) {
	if (!!(left + right)) return;
	return "zero";
}

// A name prints as the comparison it was set to.
function stored(left, right) {
	const same = !!(left === right);
	if (same) return;
	return "different";
}

function storedSum(left, right) {
	const nonZero = !!(left + right);
	if (nonZero) return;
	return "zero";
}

// Negated where its value is read, the name takes the parentheses back.
function storedValue(left, right) {
	const same = !!(left === right);
	return !same;
}

// One `!` prints as the opposite comparison, which the swap negates again.
function storedNegation(left, right) {
	const different = !(left == right);
	if (different) {
		updates++;
	} else {
		return "same";
	}
}

// Without a comparison, `!!` prints as its operand under one `!`.
function truth(value) {
	if (!!value) return;
	return "falsy";
}

console.log(equality(1, 2), equality(1, 1));
console.log(strictEquality(1, 2), strictEquality(1, 1));
console.log(inequality(1, 2), inequality(1, 1));
console.log(strictInequality(1, 2), strictInequality(1, 1));
console.log(counted(1, 2), counted(1, 1), updates);
console.log(ordering(1, 2), ordering(2, 1), ordering(NaN, 1));
console.log(sum(1, 2), sum(1, -1));
console.log(stored(1, 2), stored(1, 1));
console.log(storedSum(1, 2), storedSum(1, -1));
console.log(storedValue(1, 2), storedValue(1, 1));
console.log(storedNegation(1, 2), storedNegation(1, 1), updates);
console.log(truth(1), truth(0));
