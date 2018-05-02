it("should receive a namespace object when importing commonjs", function(done) {
	import("./cjs.js").then(function(result) {
		expect(result).toEqual({ default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" });
		done();
	}).catch(done);
});

it("should receive a namespace object when importing commonjs with __esModule", function(done) {
	import("./cjs-esmodule.js").then(function(result) {
		expect(result).toEqual({ default: { __esModule: true, named: "named", default: "default" }, [Symbol.toStringTag]: "Module" });
		done();
	}).catch(done);
});

function contextCJS(name) {
	return Promise.all([
		import(`./dir-cjs/${name}.js`),
		import(/* webpackMode: "lazy-once" */`./dir-cjs?1/${name}.js`),
		import(/* webpackMode: "eager" */`./dir-cjs?2/${name}.js`)
	]).then(function(results) {
		return import(/* webpackMode: "weak" */`./dir-cjs/${name}.js`).then(function(r) {
			results.push(r);
			return results;
		});
	});
}

function contextHarmony(name) {
	return Promise.all([
		import(`./dir-harmony/${name}.js`),
		import(/* webpackMode: "lazy-once" */`./dir-harmony?1/${name}.js`),
		import(/* webpackMode: "eager" */`./dir-harmony?2/${name}.js`)
	]).then(function(results) {
		return import(/* webpackMode: "weak" */`./dir-harmony/${name}.js`).then(function(r) {
			results.push(r);
			return results;
		});
	});
}

function contextMixed(name) {
	return Promise.all([
		import(`./dir-mixed/${name}.js`),
		import(/* webpackMode: "lazy-once" */`./dir-mixed?1/${name}.js`),
		import(/* webpackMode: "eager" */`./dir-mixed?2/${name}.js`)
	]).then(function(results) {
		return import(/* webpackMode: "weak" */`./dir-mixed/${name}.js`).then(function(r) {
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
		promiseTest(contextCJS("one"), { default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextCJS("two"), { default: { __esModule: true, named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextCJS("three"), { default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
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
		promiseTest(contextMixed("one"), { default: { named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextMixed("two"), { default: { __esModule: true, named: "named", default: "default" }, [Symbol.toStringTag]: "Module" }),
		promiseTest(contextMixed("three"), { named: "named", default: "default", [Symbol.toStringTag]: "Module" }),
		promiseTest(contextMixed("null"), { default: null, [Symbol.toStringTag]: "Module" })
	]);
});
