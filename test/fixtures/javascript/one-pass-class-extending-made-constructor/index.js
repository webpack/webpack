(function () {
	class A extends function () {} {}
	class B extends class {} {}
	class C extends class {
		[console.log("kept")]() {}
	} {}
	try {
		class D extends function* () {} {}
	} catch (e) {
		console.log(e.name);
	}
	try {
		class E extends (() => 1) {}
	} catch (e) {
		console.log(e.name);
	}
})();
