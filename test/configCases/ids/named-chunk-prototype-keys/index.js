const load = {
	toString: () => import(/* webpackChunkName: "toString" */ "./c_toString"),
	constructor: () => import(/* webpackChunkName: "constructor" */ "./c_constructor"),
	valueOf: () => import(/* webpackChunkName: "valueOf" */ "./c_valueOf"),
	hasOwnProperty: () =>
		import(/* webpackChunkName: "hasOwnProperty" */ "./c_hasOwnProperty"),
	["__proto__"]: () => import(/* webpackChunkName: "__proto__" */ "./c___proto__")
};
const names = Object.keys(load);

it(`should load chunks named like Object.prototype keys (${TARGET})`, () =>
	Promise.all(names.map((name) => load[name]())).then((modules) => {
		expect(modules.map((m) => m.default)).toEqual(names);
	}));

it(`should give them ids that are not Object.prototype keys (${TARGET})`, () => {
	for (const name of names) {
		const chunk = __STATS__.children[__STATS_I__].chunks.find((c) => c.names.includes(name));
		expect(chunk.id).toBe(`${name}0`);
		expect(chunk.files).toEqual([`${TARGET}-${name}.chunk.js`]);
	}
});
