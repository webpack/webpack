class Kept {
	value() {
		return 1;
	}
}
console.log(new Kept().value());
class Moved {
	value() {
		return 2;
	}
}
console.log(new Moved().value());
