// A `let` or `const` set to a function returning a literal or its first
// parameter prints each call after its declarator as that literal.
const id = (x) => x;
const same = function (x) {
	return x;
};
const five = () => 5;
console.log(id(1), id(2, 3), same("a"), five(), five("unused"));
try {
	early(1);
} catch (e) {
	console.log("dead zone");
}
const early = (x) => x;
console.log(early(2));
function later() {
	return nested(3);
}
const nested = (x) => x;
console.log(later());
let kept = (x) => x;
console.log(kept(4, console.log("runs")));
switch (1) {
	case 0:
		const skipped = (x) => x;
	case 1:
		try {
			console.log(skipped(5));
		} catch (e) {
			console.log("skipped");
		}
}
