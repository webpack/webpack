import * as namespace from "./module.js";

it("should work with destructuring", function() {
	{
		const { foo } = namespace;
		expect(foo).toBe("bar");
	}

	{
		let foo;
		({ foo } = namespace);
		expect(foo).toBe("bar");
	}

	{
		let foo;
		({ foo = 'foo' } = namespace);
		expect(foo).toBe("bar");
	}

	{
		const { foo = 'foo' } = namespace;
		expect(foo).toBe("bar");
	}

	{
		const strings = [];
		({ foo : strings[0] } = namespace);
		expect(strings[0]).toBe("bar");
	}

	{
		const { foo: otherFoo = 'foo' } = namespace;
		expect(otherFoo).toBe("bar");
	}

	{
		const { bar = 'foo' } = namespace;
		expect(bar).toBe("foo");
	}
});
