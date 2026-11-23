class First {}
class Unread {}
class Third {
	value() {
		return 3;
	}
}
console.log(typeof new First(), new Third().value());
class Fourth {}
console.log(new Fourth() instanceof Object);
class Before {}
class Heir extends Object {}
console.log(new Before() instanceof Object, new Heir() instanceof Object);
class Last {}
