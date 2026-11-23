// `delete` of a name a declaration binds deletes nothing and is false, in
// sloppy code; its read goes, as the name prints nowhere.
var count = 10;
function local() {
	var unset;
	if (delete unset) count--;
}
local();
console.log(count);
function bindings(param) {
	var value = 2;
	try {
		throw 1;
	} catch (error) {
		console.log(delete param, delete arguments, delete error);
	}
	console.log(delete (value), value);
}
bindings(5);
(function named() {
	console.log(delete named, typeof named);
})();
// A name `eval`, `with` or nothing declares may be deleted.
function evaluated() {
	var kept = 1;
	eval("");
	console.log(delete kept, kept);
}
evaluated();
function scoped() {
	var object = { inner: 1 };
	with (object) console.log(delete inner);
	console.log(object.inner);
}
scoped();
globalThis.loose = 1;
console.log(delete loose, typeof loose);
