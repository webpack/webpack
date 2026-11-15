it("should keep escaped characters of a template literal context request as text", () => {
	var name = "a";
	expect(require(`./dir/${name}.js`)).toBe("a");
	expect(() => require(`./dir/${name}\`.js`)).toThrow(/Cannot find module/);
	expect(() => require(`./dir/${name}\${name}.js`)).toThrow(
		/Cannot find module/
	);
	expect(() => require(`./dir/\`${name}.js`)).toThrow(/Cannot find module/);
	expect(() => require(`./dir/${name}\`${name}\`${name}.js`)).toThrow(
		/Cannot find module/
	);
	expect(() => require(`./dir/${name}${"`"}.js`)).toThrow(/Cannot find module/);
	expect(() => require(String.raw`./dir/${name}${"`"}.js`)).toThrow(
		/Cannot find module/
	);
	expect(() => require(String.raw`./dir/${name}${"${"}.js`)).toThrow(
		/Cannot find module/
	);
});
