module.exports = async function () {
	const defaultResolve = this.getResolve({});
	const overrideResolve = this.getResolve({
		mainFields: []
	});
	const customKnownResolve = this.getResolve({
		dependencyType: "stylesheet"
	});
	const customUnknownResolve = this.getResolve({
		dependencyType: "fizz"
	});
	const resolved1 = await this.getResolve()(this.context, "package2");
	const resolved2 = await defaultResolve(this.context, "package2");
	const resolved3 = await overrideResolve(this.context, "./package");
	const resolved4 = await customKnownResolve(this.context, "package2");
	const resolved5 = await customUnknownResolve(this.context, "package2");
	expect(await defaultResolve(this.context, undefined).catch(e => "ok")).toBe(
		"ok"
	);
	expect(await defaultResolve(undefined, "package2").catch(e => "ok")).toBe(
		"ok"
	);
	expect(await defaultResolve(undefined).catch(e => "ok")).toBe("ok");
	return `
export { default as a } from ${JSON.stringify(resolved1)};
export { default as b } from ${JSON.stringify(resolved2)};
export { default as c } from ${JSON.stringify(resolved3)};
export { default as d } from ${JSON.stringify(resolved4)};
export { default as e } from ${JSON.stringify(resolved5)};
`;
};
