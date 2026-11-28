// `x===c?c:x` gives `x` either way: where the test holds, `x` is `c`.
function same(value) {
	return [
		value === undefined ? void 0 : value,
		value !== null ? value : null,
		(value === "x" ? "x" : value) + "!"
	];
}
// `0` and `-0` compare equal, and another constant or name differs.
function kept(value, other) {
	return [value === 0 ? 0 : value, value === 1 ? 2 : value, value === other ? other : value];
}
console.log(same(undefined), same(null), same("x"), same(3));
console.log(kept(-0, 1), kept(1, 1), kept(2, 2));
console.log(Object.is(kept(-0, 1)[0], 0));
