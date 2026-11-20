function declared(a, b) {
	var a = b;
	return typeof a;
}
function missing() {
	var a = notDeclaredAnywhere;
	return typeof a;
}
function removed(b) {
	var a = b;
	return delete a;
}
console.log(declared(0, "x"), declared(0));
try {
	console.log(missing());
} catch (e) {
	console.log(e.name);
}
console.log(removed(1));
