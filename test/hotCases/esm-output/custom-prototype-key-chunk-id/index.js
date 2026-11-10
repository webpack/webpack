import update from "../../update.esm";

const load = {
	toString: () => import(/* webpackChunkName: "toString" */ "./c_toString"),
	constructor: () => import(/* webpackChunkName: "constructor" */ "./c_constructor"),
	valueOf: () => import(/* webpackChunkName: "valueOf" */ "./c_valueOf"),
	hasOwnProperty: () =>
		import(/* webpackChunkName: "hasOwnProperty" */ "./c_hasOwnProperty")
};
const names = Object.keys(load);

import.meta.webpackHot.accept([
	"./c_toString",
	"./c_constructor",
	"./c_valueOf",
	"./c_hasOwnProperty"
]);

const loadAll = () =>
	Promise.all(names.map((name) => load[name]().then((m) => m.value)));

it("should load and update chunks whose custom ids are Object.prototype keys", (done) => {
	expect(names).toHaveLength(4);
	loadAll()
		.then((values) => {
			expect(values).toEqual(names.map((name) => `${name}1`));
			NEXT(
				update(done, true, () => {
					loadAll()
						.then((updated) => {
							expect(updated).toEqual(names.map((name) => `${name}2`));
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
