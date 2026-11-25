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

function counted(left, right) {
	if (!!(left == right)) {
		updates++;
	} else {
		return "kept";
	}
}

function ordering(left, right) {
	if (!!(left < right)) return;
	return "not less";
}

function sum(left, right) {
	if (!!(left + right)) return;
	return "zero";
}

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

function storedValue(left, right) {
	const same = !!(left === right);
	return !same;
}

function storedNegation(left, right) {
	const different = !(left == right);
	if (different) {
		updates++;
	} else {
		return "same";
	}
}

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
