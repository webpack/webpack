var words = "COMPASS? Overpass.";
console.log(JSON.stringify(words.match(new RegExp("(pass)", "ig"))));
console.log(RegExp("^https//").source, String(RegExp("/")));
console.log(4 / RegExp("ab").source.length, RegExp("x") instanceof RegExp);
console.log(RegExp("").test("q"), RegExp("a", "g") !== RegExp("a", "g"));
function make() {
	return RegExp("x", "g");
}
var first = make();
first.lastIndex = 3;
console.log(first === make(), make().lastIndex);
try {
	RegExp("[");
} catch (error) {
	console.log(error.name);
}
try {
	RegExp("a", "gg");
} catch (error) {
	console.log(error.name);
}
console.log(RegExp("</script>").test("</script>"));
