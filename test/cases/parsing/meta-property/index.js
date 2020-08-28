class A {
	constructor() {
		if (new.target === B) {
			this.val = 2;
		} else {
			this.val = 1;
		}
	}
}

class B extends A {}

it("should respect meta property name", () => {
	const b = new B();
	const a = new A();

	expect(b.val).toBe(2);
	expect(a.val).toBe(1);
});
