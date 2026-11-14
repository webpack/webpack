var log = [];
var count = 2;
function make(tag, value) {
	log.push(tag);
	return { value: value };
}
function pure(a, b) {
	return [a, b];
}
var Widget = ({ size = 1, label }) =>
	/*#__PURE__*/ pure(make("w", size), { label: label, half: size / 2 });
Widget({});
(function () {
	return /*#__PURE__*/ pure(make("r1"), make("r2"));
})();
(function () {
	for (var i = 0; i < 2; i++) make("loop");
	if (count) return /*#__PURE__*/ pure(make("r3"), make("r4"));
})();
(() => /*#__PURE__*/ pure(make("a1"), make("a2")))();
(({ size }) => /*#__PURE__*/ pure(make("a3"), size))({ size: make("a4") });
(() => /*#__PURE__*/ pure({ x: make("o") }))();
(({ size }) => [size])({ size: make("b") });
/*#__PURE__*/ pure(/*#__PURE__*/ pure(make("n1"), make("n2")), make("n3"));
/*#__PURE__*/ pure(/*#__PURE__*/ pure(make("s1"), make("s2")));
/*#__PURE__*/ pure([/*#__PURE__*/ pure(make("e1"))]);
(async () => /*#__PURE__*/ pure(make("async")))();
(function* () {
	return /*#__PURE__*/ pure(make("generator"));
})().next();
(function () {
	return /*#__PURE__*/ pure(arguments[0]("arguments"));
})(make);
count = 2;
(function self() {
	return (count-- && self()).value, /*#__PURE__*/ pure(make("self"));
})();
var read = (tag) => /*#__PURE__*/ pure(make(tag));
var kept = read("kept");
function declared(tag, other) {
	return /*#__PURE__*/ pure(make(tag), other);
}
declared("declared", 1);
console.log(log.join(), kept.length);
