// `undefined` is no regular expression, so `RegExp` makes a new one
// called alike with or without `new`.
var empty = new RegExp(undefined);
var flagged = new RegExp(undefined, "g");
// A pattern not known keeps `new`, as `RegExp(r)` may hand `r` back.
function wrap(pattern) {
	return new RegExp(pattern);
}
var literal = /a/;
console.log(String(empty), String(flagged), wrap(literal) === literal);
