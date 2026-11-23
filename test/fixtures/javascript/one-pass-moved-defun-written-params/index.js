// A declaration whose one read is a call takes what the call passes for a
// parameter it writes, as a function written at its call does.
function bumped(count) {
	count++;
	console.log(count * 1);
}
bumped(2);
function added(text, more) {
	text = text + "b";
	more += 1;
	console.log(text, more);
}
added("a", 4);
function outer() {
	function inner(step) {
		step--;
		return step;
	}
	return inner(10);
}
console.log(outer());
// Each read of its name, a spread or `arguments` keeps the parameter.
function twice(value) {
	value++;
	console.log(value);
}
twice(1);
twice(2);
function spread(value) {
	value++;
	console.log(value);
}
spread.apply(null, [5]);
function mapped(value) {
	value++;
	console.log(value, arguments[0]);
}
mapped(7);
function looped(value) {
	value++;
	console.log(value);
}
for (var i = 0; i < 2; i++) looped(i);
