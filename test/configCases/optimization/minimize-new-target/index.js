const calledWithoutNew = (function () {
	return !new.target;
})();

it("should keep new.target inside a function in a valid bundle", () => {
	expect(calledWithoutNew).toBe(true);
});

it("should keep separate new.target values in called and constructed functions", () => {
	class Outer {
		constructor() {
			this.called = (function () {
				return new.target;
			})();
			this.arrow = (() => new.target)();
		}
	}
	const instance = new Outer();
	expect(instance.called).toBeUndefined();
	expect(instance.arrow).toBe(Outer);
});

it("should preserve new.target captured by a returned arrow", () => {
	const Reader = function () {
		return () => new.target;
	};
	expect(Reader()()).toBeUndefined();
	expect(new Reader()()).toBe(Reader);
});

it("should keep new.target in a nested regular function", () => {
	const Inner = (function () {
		return function () {
			return new.target;
		};
	})();
	expect(Inner()).toBeUndefined();
	expect(new Inner()).toBe(Inner);
});

it("should keep new.target used to evaluate a class's computed key", () => {
	const Direct = (function () {
		return class {
			[new.target]() {}
		};
	})();
	const Captured = (function () {
		return () =>
			class {
				[new.target]() {}
			};
	})()();
	expect(typeof Direct.prototype.undefined).toBe("function");
	expect(typeof Captured.prototype.undefined).toBe("function");
});

it("should keep new.target used to evaluate a class's heritage", () => {
	const Derived = (function () {
		return class extends (new.target || Object) {};
	})();
	expect(Object.getPrototypeOf(Derived)).toBe(Object);
});
