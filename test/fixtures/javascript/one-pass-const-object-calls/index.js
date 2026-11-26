// Calls returning a `const` set to a function, class, array or object
// compare loosely, as two objects do; a `let` written later does not.
const made = () => null;
const pick = () => made;
console.log(pick() === pick());
const list = [];
const listed = () => list;
console.log(listed() !== listed());
function scoped() {
	const box = {};
	const boxed = () => box;
	return boxed() === boxed();
}
console.log(scoped());
let later = {};
const read = () => later;
later = 1;
console.log(read() === read());
