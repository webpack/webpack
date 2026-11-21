// A call of a function returning its first parameter prints that argument.
const id = (x) => x;
var o = {
	m: function () {
		return this === o;
	}
};
var count = 0;
function side() {
	count++;
	return count;
}
console.log(id(side()), id(), id(undefined), id(count, 1), [id(o)][0] === o);
// Called, a member it returns is called with no `this`.
console.log(id(o.m)(), id(side)(), id(o["m"])());
// A value it would name, an operand and a function called stay calls.
const named = id(function () {});
console.log(named.name, id(count) + 1, id(() => 2)(), typeof id(function () {}));
try {
	id()();
} catch (error) {
	console.log(error.name);
}
