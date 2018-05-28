it("should receive a namespace object when importing commonjs", function(done) {
	import("./cjs").then(function(result) {
		expect(result).toEqual({ named: "named", default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" });
		done();
	}).catch(done);
});

it("should receive a namespace object when importing commonjs with __esModule", function(done) {
	import("./cjs-esmodule").then(function(result) {
		expect(result).toEqual({ __esModule: true, named: "named", default: "default" });
		done();
	}).catch(done);
});

function contextCJS(name) {
	return Promise.all([
		import(`./dir-cjs/${name}`),
		import(/* webpackMode: "lazy-once" */`./dir-cjs?1/${name}`),
		import(/* webpackMode: "eager" */`./dir-cjs?2/${name}`)
	]).then(function(results) {
		return import(/* webpackMode: "weak" */`./dir-cjs/${name}`).then(function(r) {
			results.push(r);
			return results;
		});
	});
}

function contextHarmony(name) {
	return Promise.all([
		import(`./dir-harmony/${name}`),
		import(/* webpackMode: "lazy-once" */`./dir-harmony?1/${name}`),
		import(/* webpackMode: "eager" */`./dir-harmony?2/${name}`)
	]).then(function(results) {
		return import(/* webpackMode: "weak" */`./dir-harmony/${name}`).then(function(r) {
			results.push(r);
			return results;
		});
	});
}

function contextMixed(name) {
	return Promise.all([
		import(`./dir-mixed/${name}`),
		import(/* webpackMode: "lazy-once" */`./dir-mixed?1/${name}`),
		import(/* webpackMode: "eager" */`./dir-mixed?2/${name}`)
	]).then(function(results) {
		return import(/* webpackMode: "weak" */`./dir-mixed/${name}`).then(function(r) {
			results.push(r);
			return results;
		});
	});
}

function promiseTest(promise, equalsTo) {
	return promise.then(function(results) {
		for(const result of results)
			expect(result).toEqual(equalsTo);
	});
}

it("should receive a namespace object when importing commonjs via context", function() {
	return Promise.all([
		promiseTest(contextCJS("one"), { named: "named", default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextCJS("two"), { __esModule: true, named: "named", default: "default" }),
		promiseTest(contextCJS("three"), { named: "named", default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextCJS("null"), { default: null, [Symbol.toStringTag]: "Module" })
	]);
});

it("should receive a namespace object when importing harmony via context", function() {
	return Promise.all([
		promiseTest(contextHarmony("one"), { named: "named", default: "default", [Symbol.toStringTag]: "Module" }),
		promiseTest(contextHarmony("two"), { named: "named", default: "default", [Symbol.toStringTag]: "Module" }),
		promiseTest(contextHarmony("three"), { named: "named", default: "default", [Symbol.toStringTag]: "Module" })
	]);
});

it("should receive a namespace object when importing mixed content via context", function() {
	return Promise.all([
		promiseTest(contextMixed("one"), { named: "named", default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextMixed("two"), { __esModule: true, named: "named", default: "default" }),
		promiseTest(contextMixed("three"), { named: "named", default: "default", [Symbol.toStringTag]: "Module" }),
		promiseTest(contextMixed("null"), { default: null, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextMixed("json.json"), { named: "named", default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" })
	]);
});
