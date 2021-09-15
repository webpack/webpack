it("should receive a namespace object when importing commonjs", function (done) {
	import("./cjs.js")
		.then(function (result) {
			expect(result).toEqual(
				nsObj({
					default: { named: "named", default: "default" },
					named: "named"
				})
			);
			done();
		})
		.catch(done);
});

it("should receive a namespace object when importing commonjs with __esModule", function (done) {
	import("./cjs-esmodule.js")
		.then(function (result) {
			expect(result).toEqual(
				nsObj({
					default: { __esModule: true, named: "named", default: "default" },
					named: "named"
				})
			);
			done();
		})
		.catch(done);
});

function contextCJS(name) {
	return Promise.all([
		import(`./dir-cjs/${name}.js`),
		import(/* webpackMode: "lazy-once" */ `./dir-cjs?1/${name}.js`),
		import(/* webpackMode: "eager" */ `./dir-cjs?2/${name}.js`)
	]).then(function (results) {
		return import(/* webpackMode: "weak" */ `./dir-cjs/${name}.js`).then(
			function (r) {
				results.push(r);
				return results;
			}
		);
	});
}

function contextHarmony(name) {
	return Promise.all([
		import(`./dir-harmony/${name}.js`),
		import(/* webpackMode: "lazy-once" */ `./dir-harmony?1/${name}.js`),
		import(/* webpackMode: "eager" */ `./dir-harmony?2/${name}.js`)
	]).then(function (results) {
		return import(/* webpackMode: "weak" */ `./dir-harmony/${name}.js`).then(
			function (r) {
				results.push(r);
				return results;
			}
		);
	});
}

function contextMixed(name) {
	return Promise.all([
		import(`./dir-mixed/${name}`),
		import(/* webpackMode: "lazy-once" */ `./dir-mixed?1/${name}`),
		import(/* webpackMode: "eager" */ `./dir-mixed?2/${name}`)
	]).then(function (results) {
		return import(/* webpackMode: "weak" */ `./dir-mixed/${name}`).then(
			function (r) {
				results.push(r);
				return results;
			}
		);
	});
}

function promiseTest(promise, equalsTo) {
	return promise.then(function (results) {
		expect(results).toEqual(results.map(() => equalsTo));
	});
}

it("should receive a namespace object when importing commonjs via context", function () {
	return Promise.all([
		promiseTest(
			contextCJS("one"),
			nsObj({ default: { named: "named", default: "default" }, named: "named" })
		),
		promiseTest(
			contextCJS("two"),
			nsObj({
				default: { __esModule: true, named: "named", default: "default" },
				named: "named"
			})
		),
		promiseTest(
			contextCJS("three"),
			nsObj({ default: { named: "named", default: "default" }, named: "named" })
		),
		promiseTest(contextCJS("null"), nsObj({ default: null }))
	]);
});

it("should receive a namespace object when importing harmony via context", function () {
	return Promise.all([
		promiseTest(
			contextHarmony("one"),
			nsObj({ named: "named", default: "default" })
		),
		promiseTest(
			contextHarmony("two"),
			nsObj({ named: "named", default: "default" })
		),
		promiseTest(
			contextHarmony("three"),
			nsObj({ named: "named", default: "default" })
		)
	]);
});

it("should receive a namespace object when importing mixed content via context", function () {
	return Promise.all([
		promiseTest(
			contextMixed("one.js"),
			nsObj({ default: { named: "named", default: "default" }, named: "named" })
		),
		promiseTest(
			contextMixed("two.js"),
			nsObj({
				default: { __esModule: true, named: "named", default: "default" },
				named: "named"
			})
		),
		promiseTest(
			contextMixed("three.js"),
			nsObj({ named: "named", default: "default" })
		),
		promiseTest(contextMixed("null.js"), nsObj({ default: null })),
		promiseTest(
			contextMixed("json.json"),
			nsObj({ default: { named: "named", default: "default" } })
		)
	]);
});
