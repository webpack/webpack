class Counter {
	#count = 1;
	get count() {
		return this.#count;
	}
}
class Empty {}
console.log(new Counter().count, typeof new Empty());
class Twice {
	value() {
		return 2;
	}
}
console.log(new Twice().value(), new Twice().value());
class Static {
	static made = console.log("made");
}
console.log("after");
console.log(new Static() instanceof Object);
class Looped {}
for (var i = 0; i < 2; i++) console.log(new Looped() instanceof Object);
function make() {
	class Inner {
		value() {
			return 3;
		}
	}
	return new Inner().value();
}
console.log(make());
class Written {}
Written.property = 42;
console.log("written");
