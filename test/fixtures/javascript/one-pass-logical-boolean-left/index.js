// A logical left whose boolean right side decides, or gives, its value.
function t(v) {
	return v;
}
var values = [0, 1, "", "a", null, undefined, {}];
for (var i = 0; i < values.length; i++) {
	var v = values[i];
	console.log((t(v) || false) && "R", (t(v) && true) || "R");
	console.log((t(v) || true) && "R", (t(v) && false) || "R");
	var o = { p: v };
	console.log((o.p || false) && 1, (o.p && true) || 2);
	// A right side other than a boolean keeps its value.
	console.log((t(v) || 0) && "Z", (t(v) && 1) || "Y");
}
