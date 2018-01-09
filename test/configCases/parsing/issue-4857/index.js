it("should transpile unreachable branches", () => {
	let count = 0;

	// BlockStatement
	if(true) {
		count++;
	} else {
		import("NOT_REACHABLE");
	}
	if(false) {
		import("NOT_REACHABLE");
	} else {
		count++;
	}

	// ExpressionStatement
	if(true) count++;
	else import("NOT_REACHABLE");
	if(false) import("NOT_REACHABLE");
	else count++;

	// ConditionalExpression
	true ? count++ : import("NOT_REACHABLE");
	false ? import("NOT_REACHABLE") : count++;

	count.should.be.eql(6);
});

it("should not remove hoisted variable declarations", () => {
	if(false) {
		var a, [,,b,] = [], {c, D: d, ["E"]: e} = {};
		var [{["_"]: f}, ...g] = [];
	}
	(() => {
		a;
		b;
		c;
		d;
		e;
		f;
		g;
	}).should.not.throw();
});

it("should not remove hoisted function declarations in loose mode", () => {
	if(false) {
		function funcDecl() {}
	}
	(() => {
		funcDecl;
	}).should.not.throw();
});

it("should remove hoisted function declarations in strict mode", () => {
	"use strict";
	if(false) {
		function funcDecl() {}
	}
	(() => {
		funcDecl;
	}).should.throw();
});
