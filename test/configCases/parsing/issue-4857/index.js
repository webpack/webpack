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
		var a, [,,b,] = [], {c, D: d, ["E"]: e = 2} = {};
		var [{["_"]: f}, ...g] = [];
		do {
			switch(g) {
				default:
					var h;
					break;
			}
			loop: for(var i;;)
				for(var j in {})
					for(var k of {})
						break;
			try {
				var l;
			} catch(e) {
				var m;
			} finally {
				var n;
			}
			{
				var o;
			}
		} while(true);
		with (o) {
			var withVar;
		}
	}
	(() => {
		a;
		b;
		c;
		d;
		e;
		f;
		g;
		h;
		i;
		j;
		k;
		l;
		m;
		n;
		o;
	}).should.not.throw();
	(() => {
		withVar;
	}).should.throw();
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
