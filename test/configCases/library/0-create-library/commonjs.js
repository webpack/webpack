const a = 10;
const b = 20;

class MyClass {
	getValue() {
		return "my-class";
	}
}

module.exports = MyClass;
module.exports.a = a;
module.exports.b = b;
