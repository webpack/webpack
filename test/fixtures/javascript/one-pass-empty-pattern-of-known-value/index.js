// An empty object pattern taking apart a known global or a literal goes.
var {} = Math;
let {} = "text",
	[] = [];
const {} = 1,
	kept = Object.keys({ a: 1 });
console.log(kept);
try {
	var {} = null;
} catch (e) {
	console.log("null throws");
}
try {
	let {} = undefined;
} catch (e) {
	console.log("undefined throws");
}
function shadowed() {
	var Math;
	try {
		var {} = Math;
	} catch (e) {
		console.log("shadowed throws");
	}
}
shadowed();
