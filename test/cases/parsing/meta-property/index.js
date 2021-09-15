class A {
	constructor() {
		if (new.target === B) {
			this.val = 2;
		} else {
			this.val = 1;
		}
		if (typeof new.target !== "function") {
			this.val = 0;
		}
		if (typeof new.target.value !== "function") {
			this.val = 0;
		}
		if (typeof new.target.unknown !== "undefined") {
			this.val = 0;
		}
		if (!new.target.value) {
			this.val = 0;
		}
	}
	static value() {}
}

class B extends A {}

it("should respect meta property name", () => {
	const b = new B();
	const a = new A();

	expect(b.val).toBe(2);
	expect(a.val).toBe(1);
});
