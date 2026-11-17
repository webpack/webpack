// A constant key spelling a name reads after a `.`: `null`, booleans,
// `NaN` and `Infinity` key the strings they spell.
var o = { null: 1, true: 2, NaN: 3, 1: 4 };
console.log(o[null], o[true], o[NaN], o[0 / 0], o[1]);
// One name compares with itself alike loosely: `NaN` is not itself either way.
function self(value) {
	return [value === value, value !== value];
}
console.log(self(NaN).join(), self("1").join());
