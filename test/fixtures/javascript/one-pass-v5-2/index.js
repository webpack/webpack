function first(value, fallback) {
	if (value) return value;
	return fallback();
}
console.log(first("given", String), first("", () => "fallback"));
function withElse(value) {
	if (value) {
		return value;
	} else {
		return "else";
	}
}
console.log(withElse(1), withElse(0));
function joined(value, other) {
	if (value) return value;
	return other || "none";
}
console.log(joined(1, 2), joined(0, 2), joined(0, 0));
function conditional(value, other) {
	if (value) return value;
	return other ? "yes" : "no";
}
console.log(conditional(1, 0), conditional(0, 1), conditional(0, 0));
function nullish(value, other) {
	if (value) return value;
	return other ?? "nullish";
}
console.log(nullish(1, 2), nullish(0, null));
function differs(value, other) {
	if (value) return other;
	return "differs";
}
console.log(differs(1, 2), differs(0, 2));
function commentedValue(value, other) {
	if (value) return /*! value */ value;
	return other;
}
console.log(commentedValue(1, 2), commentedValue(0, 2));
