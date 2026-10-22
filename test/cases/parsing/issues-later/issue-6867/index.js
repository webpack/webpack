it("issue-6867: should compile default export unnamed function declaration", function() {
	return import(/* webpackChunkName: "a" */ "./a")
		.then(({ default: a }) => {
			a()
		});
});


it("issue-6867: should compile default export unnamed function expression", function() {
	return import(/* webpackChunkName: "b" */ "./b")
		.then(({ default: b }) => {
			b()
		});
});

it("issue-6867: should compile default export named function declaration", function() {
	return import(/* webpackChunkName: "c" */ "./c")
		.then(({ default: c }) => {
			c()
		});
});

it("issue-6867: should compile default export named function expression", function() {
	return import(/* webpackChunkName: "d" */ "./d")
		.then(({ default: d }) => {
			d()
		});
});

it("issue-6867: should compile default export unnamed class declaration", function() {
	return import(/* webpackChunkName: "e" */ "./e")
		.then(({ default: E }) => {
			new E()
		});
});


it("issue-6867: should compile default export unnamed class expression", function() {
	return import(/* webpackChunkName: "f" */ "./f")
		.then(({ default: F }) => {
			new F()
		});
});

it("issue-6867: should compile default export named class declaration", function() {
	return import(/* webpackChunkName: "g" */ "./g")
		.then(({ default: G }) => {
			new G()
		});
});

it("issue-6867: should compile default export named class expression", function() {
	return import(/* webpackChunkName: "h" */ "./h")
		.then(({ default: H }) => {
			new H()
		});
});
