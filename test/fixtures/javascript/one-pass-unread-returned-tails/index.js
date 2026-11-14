// An arrow called once, its value unread: what its body returns last goes.
var seen = [];
var log = function (value) {
	seen.push(value);
};
(function (value) {
	return log(value), 5;
})(1);
(value => (log(value), "done"))(2);
// One item left takes no parentheses, but one opening with `{` does.
(value => ({}.constructor, log(value), 1))(3);
(value => (log(value), {}.constructor, 1))(4);
// A nested sequence keeps its own parentheses.
(value => ((log(value), log(value + 1)), 1))(5);
// A value read keeps the tail.
log((value => (log(value), 6))(7));
// A template may call `toString`: it stays.
var object = { toString: function () { log("toString"); return "o"; } };
(value => (log(value), `${value}`))(object);
console.log(seen.join());
