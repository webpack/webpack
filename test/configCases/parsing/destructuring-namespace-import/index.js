import * as namespace from "./module.js";

it("should work with destructuring", function() {
	{
		const { foo } = namespace;
		expect(foo).toBe("foo");
	}

	{
		let foo;
		({ foo } = namespace);
		expect(foo).toBe("foo");
	}

	{
		let foo;
		({ foo = 'foo' } = namespace);
		expect(foo).toBe("foo");
	}

	{
		const { foo = 'foo' } = namespace;
		expect(foo).toBe("foo");
	}

	{
		const strings = [];
		({ foo : strings[0] } = namespace);
		expect(strings[0]).toBe("foo");
	}

	{
		const key = "foo";
		const { [key]: a = 'foo' } = namespace;
		expect(a).toBe("foo");
	}

	{
		const { foo: otherFoo = 'foo' } = namespace;
		expect(otherFoo).toBe("foo");
	}
});
