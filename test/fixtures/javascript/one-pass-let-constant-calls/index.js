let none = () => {};
const label = () => "label";
const ignore = function (a) {};
console.log(none(), none(), label(), label(), label(), ignore(1), ignore(2));
let later = () => {};
later = () => "written";
console.log(later(), later());
function early() {
	return kept();
}
try {
	console.log(early());
} catch (e) {
	console.log(e.name);
}
const kept = () => "kept";
console.log(kept(), kept());
const read = () => {};
console.log(read(), read(), typeof read);
{
	const inner = () => {};
	console.log(inner(), inner());
}
