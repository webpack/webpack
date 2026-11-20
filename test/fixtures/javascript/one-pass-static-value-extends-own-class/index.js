// A static value may extend the class it belongs to by that class's name.
class Dropped {
	static prop = "X";
	static Y = class extends Dropped {};
}
var Expression = class Named {
	static prop = "X";
	static Y = class Y extends Named {};
};
// An unnamed class's name is the `var`, not set yet, and so throws.
var thrown;
try {
	var Unnamed = class {
		static Y = class extends Unnamed {};
	};
} catch (e) {
	thrown = e.constructor.name;
}
console.log(thrown);
class Read {
	static prop = "R";
	static Y = class extends Read {};
}
console.log(Read.Y.prop);
