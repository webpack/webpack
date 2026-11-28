// Two primitives or more join with a `,`, which converts to `NaN`.
function plus(flag, other) {
	return [
		+[flag === 1, other === 2],
		+[0, ...[flag ? "flag" : ""], 1],
		-[typeof flag, null, undefined]
	];
}
// An element that may be an object, a hole or one element stays.
function kept(flag, other) {
	return [+[flag ? {} : 1, 2], +[1, , 2], +[other === 3], +[flag, other]];
}
console.log(plus(1, 2), kept(1, 3), kept(0, { toString: () => "4" }));
