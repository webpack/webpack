"use strict";

const { fixture } = require("../../helpers/fixture");

// cspell:ignore binop, fnames, propmangle, fargs, domprops, argnames, nondeferred, loopcontrol, Defun, defun, NOINLINE, Funarg, unmangleable, Unmangleable, thedef, funs
// cspell:ignore fnames
// cspell:ignore argnames, bcatch, bfinally, argname, truenull
// cspell:ignore AAAWA MAAH EAAI EAAIA EAAGC ACAA IAAYC EAAWC IAAIC CAAI IAAK EAAE
// cspell:ignore endline, endcol, endpos, nlb, thedef, ymgsid, dgimsy, elta

const vm = require("vm");
const acorn = require("acorn");
const { createUnicode } = require("../../../lib/javascript/syntax").printer;

/**
 * The one-pass minify: one JavaScript `SourceProcessor` run.
 * @param {string} source the source
 * @param {import("../../../lib/javascript/syntax-parser").JavascriptProcessOptions} options its options, `compress` or `mangle` among them
 * @returns {{ code: string }} the minified code
 */
const minifyOnePass = (source, options) => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");
	return /** @type {{ code: string }} */ (
		new SourceProcessor().process(source, { mode: "minify", ...options })
	);
};

/**
 * @param {string} code a program
 * @returns {string} what it prints, or the error it throws
 */
const runProgram = (code) => {
	/** @type {string[]} */
	const lines = [];
	try {
		vm.runInNewContext(code, {
			console: {
				log: (/** @type {unknown[]} */ ...values) =>
					lines.push(values.map((value) => String(value)).join(" "))
			}
		});
	} catch (err) {
		lines.push(`throws ${/** @type {Error} */ (err).name}`);
	}
	return lines.join("\n");
};

describe("syntax-printer", () => {
	it("should read characters as terser's unicode helpers do", async () => {
		const terserUnicode = await import(
			require.resolve("terser").replace(/dist[\\/]bundle\.min\.js$/, "lib/unicode.js")
		);
		const ours = createUnicode();
		/** @type {string[]} */
		const disagreements = [];
		for (let code = 0; code <= 0x10ffff; code++) {
			const character = String.fromCodePoint(code);
			for (const [mine, theirs] of [
				[ours.isIdentifierStart, terserUnicode.is_identifier_start],
				[ours.isIdentifierChar, terserUnicode.is_identifier_char],
				[ours.isIdentifierStartBroad, terserUnicode.is_identifier_start_broad],
				[ours.isIdentifierCharBroad, terserUnicode.is_identifier_char_broad]
			]) {
				if (mine(character) !== theirs(character)) {
					disagreements.push(`${theirs.name} U+${code.toString(16)}`);
				}
			}
		}
		expect(disagreements).toEqual([]);
		for (const text of ["a\u{1F600}b", "\uD83D", "\uDE00x", "x\uD83D\uDE00"]) {
			for (let i = 0; i < text.length; i++) {
				expect(ours.getFullChar(text, i)).toBe(
					terserUnicode.get_full_char(text, i)
				);
				expect(ours.getFullCharCode(text, i)).toBe(
					terserUnicode.get_full_char_code(text, i)
				);
			}
		}
		for (const name of ["a", "$_9", "9a", "a-b", "é", ""]) {
			expect(ours.isBasicIdentifier(name)).toBe(
				terserUnicode.is_basic_identifier_string(name)
			);
		}
		// What the printer asks of a name: any engine's, or Unicode 8's alone.
		expect(
			["a", "$", "\u200c", "é", "-", "\u{1E900}", "😀"].map(
				ours.isIdentifierCharacter
			)
		).toEqual([true, true, true, true, false, true, false]);
		expect(
			[
				["a", false],
				["", false],
				["9a", false],
				["a\uD800", false],
				["a\uD800", true],
				["\u{1E900}x", true],
				["é\u{1D7CE}", true],
				["\u{10000}\u{1E900}", true],
				["a-b", true]
			].map(([name, allowSurrogates]) =>
				ours.isIdentifierString(
					/** @type {string} */ (name),
					/** @type {boolean} */ (allowSurrogates)
				)
			)
		).toEqual([true, false, false, false, false, false, true, false, false]);
	});
});

const { analyzeMinifierTree } = require("../../../lib/javascript/ScopeAnalyzer");
const {
	Field,
	NodeType,
	_SyntaxTree: SyntaxTree,
	WebpackParser,
	readParsedTree
} = require("../../../lib/javascript/syntax-parser");

describe("JavaScript minifier printing a SyntaxTree", () => {
	it("should compress in the one pass where nothing outside a node decides it", () => {
		/** @type {[string, import("../../../lib/javascript/syntax-printer").MinifyOptions, string][]} */
		const cases = [
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass"),
				{},
				"if(a)b();while(a)a--;for(;;)g();c();with(o)d();do{e()}while(a);for(k in o)f(k);for(k of o)f(k);"
			],
			// An `else` after a block keeps it where the block ends in an `if` of its own.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-2"),
				{},
				"if(a){if(b)c()}else d();if(a){for(;;)if(b)c()}else d();a?b?c():e():d();if(a){e:if(b)for(;;)break e}else d();"
			],
			// A block unwrapped to the `if` it holds still ends in that `if`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-3"),
				{ mangle: false },
				"if(s){if(a)f();else if(b)g()}else h();"
			],
			// An empty loop body keeps the `;` no line break stands in for.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-4"),
				{ format: { semicolons: false } },
				"x()\ndo{}while(a)\n"
			],
			// An import attribute's value stays a string where strings print as templates.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-5"),
				{ sourceType: "module", ecma: 2020 },
				'import o from"b"with{type:"json"};o(),x=`json`;'
			],
			// A `let` takes the value set after it only where that value runs no code.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-6"),
				{},
				"let a=[1,,{b:2,c:function(){}},()=>3],b;b=[x];let c;c={[k]:1};let d;d={...e};let e2;e2={b:x},f(a,b,c,d,e2);"
			],
			// A known test's branch prints in its place, braced where it is several.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-7"),
				{},
				"if(x){b(),c()}else d();if(x){c(),e()}else d();while(x){b(),c()}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-8"),
				{},
				"if(a){let i=h();f(i,i)}if(a){let n=h();f(n,n)}if(a)var z=1;if(a){class s{}f(s)}if(a){function g(){}}a;if(a)b(),c();"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-9"),
				{ format: { comments: /before|after/ } },
				"if(a)/* before */{b()}if(a){b()/* after */}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-10"),
				{ format: { comments: /note/ } },
				"var a=1,b=2,c,[d]=e;let x=1,y=2;const z=3;var w;/* note */var q;f(a,b,c,d,x,y,z,w,q);"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-11"),
				{},
				"f(!0,!1),x=\"true\",y=true**b,z=b**!0,w={a:!1},t=typeof!0,new(!0),true`x`,v=a(!0)(!1);"
			],
			// `undefined` is `void 0` where it reads the global, not where it is bound or written.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-12"),
				{},
				"function f(n){return n===void 0?(void 0).x:\"undefined\"}function g(n){return n}y={undefined:1},z=o.undefined,w=[void 0];"
			],
			// Where anything writes it, it stays a name everywhere.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-13"),
				{},
				"x=undefined,undefined=1;for(undefined in o);undefined++;"
			],
			// Strings compare loosely, a name in brackets prints after a `.`, and
			// a `return` of `undefined` from nothing happening is bare.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-14"),
				{},
				'"string"==typeof a&&typeof b!=typeof c&&a==="s"&&"s"==typeof a&&typeof a==/*! c */"s",o.key,o?.if,o["a-b"],x=1..k,o[/*! c */"k"],o[1];function f(){}function g(){}function h(){x()}function k(){/*! c */return void 0}'
			],
			// A `const` nothing writes is a `let`, private to the module or where
			// `toplevel` says so, and a loop forever is `for(;;)`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-15"),
				{ module: true },
				'const o=g(),{x:c,y:[t=1,...e]}=o,n=1;n=2;const s=1;s++;const r=1;[r]=[];const a=1;({k:a}={});const i=1;for(i of o);export const ex=1;for(let f of o)g(f,c,t,e,1,n,s,r,a,i);for(;;)g();while(/*! t */1)g();while(o)g();'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-16"),
				{},
				"const a=1;function f(){let n=g();return h(n),n}f();"
			],
			// Unmangled, the scopes are still read: what nothing reads goes, names as written.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-17"),
				{ mangle: false },
				"function f(){}f();"
			],
			// What only dropped code reads goes too; a constant prints as its value
			// where that is shorter and the read prints as a name would; a comment
			// that does not print holds nothing back; a built-in needs no `new`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-18"),
				{ compress: { toplevel: true } },
				'var A="[object Array]",B=200;(function(r){if(r)h(2,2);return[r.t==A,A,B,B.x,1,{C:1},"d",Error("e"),new Map]})(function(){g(r);var r=2});'
			],
			// A read where the value would print otherwise keeps the name, and so
			// does a value no literal of a name's length prints the same.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-19"),
				{ compress: { toplevel: false, side_effects: false } },
				'function f(){var e="a",n="b",r="d",f="e",t=/r/,A=-1,B=1n;e,n,delete r,g(f);return[t,A,B,e,n,r,f]}f();'
			],
			// Constants fold; a name nothing reads goes from a function or class
			// expression; `null` and `undefined` test as one; a `let` needs no
			// `undefined`; and a function's last `return` of nothing goes.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-20"),
				{},
				'function f(n,e){var a=typeof d+"y";let d;var t=void 0;t=1;var u=class{};g(n==null,e!=null,n==null,4294967294,"abc","abc".length,!0,true.x,d,t,function(){},u,function n(){return n},a,"s"==typeof n)}'
			],
			// A name set to another nothing writes reads that one; a function
			// read once prints where it is read, where that runs after it once.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-21"),
				{},
				"function f(c,s,t){g(t.kind,t,{s:t}),c.exports=c=>c+t;if(s)var n=()=>1;g(n);switch(s){case 1:var o=()=>2;case 2:g(o)}let r=()=>3;for(;;)g(r);g(function(){})}"
			],
			// A `var` is a constant where nothing called before it can read it,
			// nor a read in its own function before it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-22"),
				{},
				"function f(){g();var n=2;return y=3,function(){return[1,n.x,3]}}function h(){var n=r,r=4;return[n,function(){return r}]}function j(){x=1;var n=6;return function(){return[5,n.x,n]}}"
			],
			// A function declared and called once prints where it is called,
			// but not into a loop, but for one returning a value a call passing nothing prints, nor where the call comes before it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-23"),
				{},
				"function f(n){function r(n){return n?r(n-1):0}var t=2+n;for(;;);g(t,r);return[2]}"
			],
			// A name nothing reads goes, its value still running; a `var` set
			// after a call is a constant where only its own function reads it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-24"),
				{},
				"function f(){g();h();var n=k();(function(){}).call();m();return 1+n}function u(){g();h();return[1,function(){return 2}]}"
			],
			// A `var` set after a call is a constant where a function made after
			// it reads it, and a function called once from another moves there.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-25"),
				{},
				'function u(){return g(),h(function(){return"z1"},function(){return function(){return"v3"}}),function(){return"w2"}}function f(n){let r=()=>this;return[function(r){return r+n},function(){return function(){return this}()},function(){return r()}]}'
			],
			// What a statement sets folds into the next where that reads it first,
			// but not past a compound assignment's read nor a name it may write.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-26"),
				{},
				'function f(i,e,n){var t=i.indexOf("x",e);if(t===-1||t>n)return 1;g(i);r(),t=2;while(t)t--;var a=h();q+=a;var u=h();w(u),w=1;return[h(),2]}function r(){}var q,w;'
			],
			// What folds to a constant prints its value where that is shorter,
			// and a template's parts that fold are its text; a tag's are not.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-27"),
				{},
				'function f(S){let n="\\\\/";return["[^\\\\/]",`${S}{1,2}(?:[\\\\/]|$)`,65536,65536,S._x,a- -5,"_check",3,String.raw`${n}`,n,n]}'
			],
			// A `typeof` tests against "u"; a `do` body that is no block stays
			// one; a `new` with arguments folds bare, one without in parentheses.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-28"),
				{},
				'g(typeof a<"u",typeof b>"u","object"!=typeof d);do{e()}while(a);function f(e){return new Set(e)}function k(){return(new X)()}'
			],
			// A function reading `arguments` may write a parameter through it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-29"),
				{},
				"function h(n){let e=n;return arguments[0]=2,e}h(1);"
			],
			// A preamble prints once, before the code.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-30"),
				{ format: { preamble: "/* p */" } },
				"/* p */\nfunction f(){return 1}f();"
			],
			// A `with` may bind `undefined`, so every one stays a name.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-31"),
				{},
				"f(undefined);with(o)f(undefined);"
			],
			// What nothing reads goes where its value makes nothing happen.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-32"),
				{},
				"function f(n){g();({[q]:1});({...o});`${n}`;g();var t=0;return n}var top=1;function topFunction(){}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-33"),
				{ format: { comments: /keep/ } },
				'function f(n){var n=1;return arguments[0]}function g(){}function e(){var x=1;eval("x")}function w(){}function l(){-b}'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-34"),
				{ module: true },
				"export function e(){}var ex=1;export{ex};"
			],
			// A `using` declaration disposes of each of its names alone.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-35"),
				{},
				"{using a=b();using c=d();f(a,c)}"
			],
			// A value folded into a declarator that goes still runs.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-36"),
				{},
				"function g(){f()}function h(){f()}"
			],
			// Without the mangler, a global `const` still folds where it is read.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-37"),
				{ mangle: false },
				'const k=1;print(a+1,"1",o[c]);'
			],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-38"), { mangle: false }, "function f(){a}"],
			// A `var` whose dropped declarator prints apart keeps its braces.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-39"),
				{},
				"function h(c){if(c){f();var n=2}return n}"
			],
			// An alias cycle has no name at its end to read.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-40"),
				{},
				"function q(){let n=t,t=n;return n}"
			],
			// Constants fold through every operator terser evaluates.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-41"),
				{},
				"function f(a){return[12,0,0,2,3,1,!1,!0,!0,!1,!0,!1,!0,3 in a,-4,3,\"number\",void 3,1,3/2,1,9,6]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-42"),
				{},
				"function f(){return[2,1,1,0,3,4,5,8]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-43"),
				{},
				"function f(){let n=null;return[!0,!0,!0,!1,!1,!1,!1,n,n,n,n]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-44"),
				{},
				"function f(){return 1}"
			],
			// A constant's value folds where only its value is known.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-45"),
				{},
				"function f(){g(-4,1,\"number\",\"object\",-1,!0,2,3,5,6,!0,1 instanceof 2,9)}"
			],
			// What nothing reads goes where its value makes nothing happen.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-46"),
				{},
				"function f(){}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-47"),
				{},
				"function f(){g()}function h(){return g()}function i(){}function j(){}"
			],
			// A value kept as a statement keeps it from reading as a declaration.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-48"),
				{},
				"function f(a){({}).x+g();(class{}).y||g();g();(function(){})`t${g()}`;({}).p++;++a.p;new X(g());a.q=g()}"
			],
			// A function moved to its read prints in parentheses where it would not read as a value.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-49"),
				{},
				"function f(){(function(){}||h)();(function(){})`t`;({}).r++}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-50"),
				{},
				"function f(){h({k:function(){}}),h(function(){}+1),h({[function(){}]:1})}"
			],
			// The global `undefined` is `void 0` only where it is read as a value.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-51"),
				{},
				"function f(){return[void 0,function(n=void 0){return n},{k:void 0},{undefined:void 0}]}var v=void 0;({k:v}=o);"
			],
			// A statement folds into the next one's first read, where nothing runs before it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-52"),
				{},
				"function f(x){var e=g();return e=g(),e=g(),h(...e),e=g(),delete e.y,e=g(),e=g(),e=g(),{[k]:e},e=g(),new x(e=g()),e=g(),new x(...e),new U(e=g()),e=g(),[...e],`${e=g()}`,-(e=g()),e}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-53"),
				{},
				"function f(x){var f=g();x(...f)}"
			],
			// A `const` prints as `let` only where nothing writes a name its patterns bind.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-54"),
				{},
				"function f(){var{a:a,b:[r]}=o,[c,,e]=o;return a+r+c+e}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-55"),
				{},
				"function f(o){let{a:a}=o,[c,,n]=o;return(a=1)+c+n}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-56"),
				{},
				"function f(o){const[,c]=o,{b:n}=o,[t]=o;return t=1,c+n+t}"
			],
			// An alias reads its target, a catch parameter of its name aside.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-57"),
				{},
				"function f(){let t=g();try{h(t)}catch(t){h(t)}}"
			],
			// A comment kept keeps the statement it is on.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-58"),
				{ format: { comments: /keep/ } },
				"function f(){/* keep */g(1);h()}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-59"),
				{ format: { comments: /keep/ } },
				"function f(){g(1)/* keep */}"
			],
			// Names read in a static block or a field initializer.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-60"),
				{ toplevel: true },
				"var a=1;class C{static{h(a)}x=a}h();var b=2;function q(){return b}h();"
			],
			// A `using` declaration's value runs, read or not.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-61"),
				{},
				"{using a=b()}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-62"),
				{},
				"{let a=g();using b=a;h(b)}"
			],
			// A callee a read of which may throw is read before what a statement set runs.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-63"),
				{},
				"function f(){var x=s();n(x);let n=()=>{}}function h(){s();new x;class x{}}function i(){x(s());var x=()=>{}}"
			],
			// A directive stays, and so does a global set before a call that may read it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-64"),
				{},
				"function f(){\"use strict\";g()}function h(){x=g(),k(x)}"
			],
			// A kept comment on a function keeps it where it is declared.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-65"),
				{},
				"function f(){var n=/*! lic */function(){};h(n)}function i(){h(function(){})}function j(){var n=function(){};for(;;)h(n)}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-66"),
				{ format: { comments: /keep/ } },
				"function f(){var n=function(){}/* keep */;h(n)}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-67"),
				{ format: { comments: /keep/ } },
				"function f(){var n=/* keep */function(){};h(n)}function i(){g(1)}"
			],
			// A function moved into one moving to its call prints in parentheses where that call opens a statement, and stays where a name declared there shadows one it reads.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-68"), {}, "function f(){function o(o){console.log(o)}o(42),o(1)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-69"), { compress: { toplevel: true }, mangle: false }, "!function(){function b(){same_name()}(function(same_name){console.log(same_name),b()})()}();"],
			// An exported name declared again without `export` stays exported, and two functions reading each other stay a cycle that goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-70"), { module: true }, "export var f;var f=0;f=1;"],
			// A function moved to a call nothing reads prints its statements there, unless it reads `this` or its value is read.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-71"), { compress: { toplevel: true } }, "let a;g(a=\"1\"),function(){g(this)}(),x=function(){g()}();"],
			// A call of a function running expression statements before its `return` prints them and the value as one sequence.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-72"), { compress: { toplevel: true } }, "var await,yield;(async function(){(function(){await=1})()})();(async function(){!function(){await=2}(),x=function(){return await}()})();(function*(){!function(){yield=1}()})().next();g(await,yield);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-73"), { compress: { toplevel: true } }, "x=function(){return g(this),1}(),y=function(){return g(arguments),1}(),z=function(){return g(new.target),1}();function m(){return g(m),1}w=m();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-74"), { compress: {} }, "a=\"\"*(x=\"s\"),b=\"\"-(x+=\"s\");function f(){return new(import(\"x\"))}console.log(void g());"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-75"), { compress: {} }, "a=[1/0][0]/x,b=[1/0][0]**x,c=-[1/0][0],d=[1/0][0]?.toFixed(),e=x/[1/0][0];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-76"), { compress: {} }, "a=0,b=\"b\",c=void 0,d=\"a\"[1],e=NaN,f=NaN,g=NaN,h=0,i=!1,j=!0,k=void f()+1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-710"), { compress: {} }, "{let o=(console.log(1),1);console.log(o,o)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-711"), { compress: {} }, "{class A{}g(A,A)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-712"), { compress: {} }, "!function(){var a=f();g(a,a)}();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-713"), { compress: {} }, "{let a=f();g(a,a)}x();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-714"), { compress: {} }, "a();function k(){b();{let n=f();g(n,n)}return 1}for(;;)(()=>{let n=f();g(n,n)})();async function q(){!function(){let n=f();await=n,g(n)}()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-715"), { compress: {} }, "function f(c){if(c===1){if(a()!==2)e()}else e()}({a:1}[k()])===1?x():y();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-716"), { compress: {} }, "a=\"false\",b=\"NaN\",c=\"Infinity\",d=NaN,e=\"\\0\",f=\"1,,\",g=\"1\";"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-717"), { compress: {} }, "function k(){return!function(){x()}()}function f(n){return n?1:function(){for(;;)g()}()}function m(){for(;;)x()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-1"), { compress: {} }, "if(a)u();a,a.b,b(),x=1,c||(x=1);d;e|+f;g,h(),i,j(),k();o=l();m(!!n);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-2"), { compress: {} }, "a(),b,f(),c(),x,g(),h(),d,e(),y,i.j,k;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-3"), { compress: {} }, "x,x,y(),foo,bar(),a(),b(),x(),c(),z(),d(),e,f(),g;function h(){return i,j()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-4"), { compress: {} }, "!function(){w}(),a(),b();c;d(void 0);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-5"), { compress: {} }, "f(),g(),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-6"), { compress: {} }, "b();if(c);+2n,-d();function*e(){yield f()}x[y],g(),x[z],h(),x[w];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-7"), { compress: {} }, "foo(),a=b(),x(),c(),y(),d(),0,{}.e();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-8"), { compress: {} }, "`${a}`,x(),`${b}`,`${c}${d}`,`${e()}`,`${f}`;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-9"), { compress: {} }, "(function(){}).i();x=1,y=(a,1),z=b-1,d,g(),h();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-10"), { compress: {} }, "var a=!0,b=!0,c=!0,d=!0,e=!!{a:f()};g(!0);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-11"), { compress: {} }, "a++,c(),d(),e(),f(),g(),i(),k();for(;;);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-12"), { compress: {} }, "f(),g(),e(),{[h]:1};"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-unread-value-bare-13"), { compress: {} }, "function f(){}function g(){x(),y()}function h(){for(;;);}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-77"), { compress: { toplevel: true } }, "f();x=g();f();(function(){})();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-78"), { compress: { toplevel: true } }, "x=(g(),1),y=(h(),{a:1}).a,a(),q(),b();"],
			// One moved into `export default` stays a value, as a declaration would be set before the module runs.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-79"), { module: true }, "export default(function(f){return f+1});"],
			// An arrow takes no parentheses there; a call reduced to an operation keeps its own.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-80"), { module: true }, "export default()=>\"b\"+v;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-81"), { module: true }, "export function h(n){return n/(1/3)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-82"), { module: true }, "export function h(n){return n*(0,1)}"],
			// A logical whose left side decides it runs nothing of its right, so `undefined.a` there goes, though alone it stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-83"), {}, "var Q=function(){return 1};g(Q),x=f,x=f,(void 0).a;"],
			// A top-level function moves to its one read where `toplevel` drops top-level names, but no `topRetain` is given.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-84"), { compress: { toplevel: true }, mangle: { toplevel: true } }, "console.log(1);function n(){return 2}console.log(n(),n());"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-85"), {}, "function c(){return 1}console.log(c());"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-85"), { compress: { toplevel: true, top_retain: ["c"] }, mangle: { toplevel: true } }, "function c(){return 1}console.log(c());"],
			// A function moved to its one read.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-86"),
				{},
				"function f(){h(function(){return 1})+1}function i(){h(()=>{})}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-87"),
				{},
				"function f(){h(()=>a)}function i(){h(async()=>1)}"
			],
			// What a `#__PURE__` annotation marks drops, where `side_effects` reads it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-88"),
				{},
				"function f(){g(h());g()}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-89"),
				{ compress: {toplevel: false,side_effects: false} },
				"function f(){g()}"
			],
			// A known global, or its member, reads without an effect, short of a `try` probing for it or a `with`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-90"),
				{},
				"function h(){undeclaredThing;JSON[x]}function t(){try{Math}catch(a){}}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-91"),
				{},
				"function w(a){var q;with(a)var m=Math,r=q}"
			],
			// Reading a member of what may be `null`, or have a getter, may throw or run it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-92"),
				{},
				"function f(o,x){({...o}).x;(o&&{}).x;(o?.p).x;(o+=1).x;(o={}).y;[1][x()];delete o.x;(x?o:{}).x;(()=>1).prototype.x;({}).x}"
			],
			// What a value converts as is known through its operators, three levels deep.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-93"),
				{},
				"function g(n,a){n+1-1;n*1-1;(0,/r/)-1;a++-1;-(n+1);(n?1:\"s\")-1;(n=1)-1;(n+=1)-1}"
			],
			// A constant's value folds where only its value is known.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-94"),
				{},
				"function f(){g(void 1,delete x)}"
			],
			// A declarator going, but keeping its value, prints it apart.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-95"),
				{},
				"function f(){var a=g();h();use(a,k())}"
			],
			// A `with` anywhere may answer any name.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-96"),
				{},
				"function w(n){with(n);}function f(){b}"
			],
			// A conversion of what may be an object may run its methods, as `in` and `instanceof` may throw.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-97"),
				{},
				"function f(a,b){a+b;-a;a in b;a instanceof b;`${a}`;+a;~a;a*2}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-98"),
				{},
				"function g(a){1n+1;1n>>>1n;(a=1)+1;(a||\"\")+1;1+ ++a}"
			],
			// Reading a member runs nothing only off what is no `null`, `undefined` or object with a getter.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-99"),
				{},
				"function f(o){o.x;({get x(){}}).x;[...o];({...o});null.x;(void 0).x;(o={}).x;(o&&={}).x;o.y.prototype}"
			],
			// A class is made with effects where its heritage or a key may run or throw.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-100"),
				{},
				"function f(){(class extends(()=>1){});(class{[k]=1});(class extends async function(){}{});(class extends({}){});(class extends function*(){}{});(class extends(1){});(class{static{q()}});(class{static y=q()})}"
			],
			// A `typeof` reads a name in its dead zone with a throw, so its value folds in after.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-101"),
				{},
				"function f(){var n=typeof t;let t=1;return n}function g(){return k}const k=2;h(g());"
			],
			// A value folds into the head of an optional chain, which runs whether or not the chain goes on, not into what the chain may skip.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-102"), {}, "function f(){return g()?.b}function h(n){let t=g();return n?.[t]}function k(){return g().c?.(d)}"],
			// A callee set before the statement a collapse moves reads the same after it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-103"),
				{},
				"function f(n){{if(n){var x=s();c(x)}let c=q}}function h(n){let x=q;if(n)x(s())}function k(){class n{}new n(s())}function m(){let n=()=>{};return function(){var x=s();n(x)}}"
			],
			// A value folds into a tag or the first part a tag reads, into the member `new` constructs where it prints bare there, and past a declared callee where it runs nothing.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-write-a-value-at-its-one-read"),
				{},
				"let use=q();function f(t){return(0,t.b)``}function g(t,n){return n`${t.b()}${d()}`}function i(t,n){let e=t.b();return n`${d()}${e}`}function h(t){return new t.foo.bar}function k(t){let n=t.foo();return new n.bar}function m(t){use(!t)}function n(t){let n=t.x;use(n)}"
			],
			// A loop head's declarator folds into the next, and an alias nothing reads goes from it, but not one a value folds into.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-write-a-value-at-its-one-read-2"),
				{},
				"function f(){for(var a=foo;bar;)return a}function g(){for(let o=foo,f=bar;baz;)return[o,f]}function h(){for(let a=foo();bar;a++)use(()=>a)}function k(){for(let o=foo(),a=o.x,f=1;f;f--)use(o,a)}function m(o){for(let f=o;o;)return o}function n(){for(let a=foo(),f=1;f;f--)use(f)}"
			],
			// A value folds into the loop after it, where its head is first evaluated, but not where it would read a name a `let` head declares or past a pattern there, nor holding `in` in a `for`'s head, nor past a `var` set in a `for … in` head.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-write-a-value-at-its-one-read-3"),
				{},
				'function a(){for(var i in{})use(i)}function b(){for(var i of i)use(i)}function c(){let i=k;for(let o of i)use(o)}function d(){for(var i=j;i<9;i++)use(i)}function e(i){var o="k"in i;for(var n=o;n;)use(n)}function f(){for(let i=g();i;)use(()=>i)}function h(){var i=g();for(var o=1 in i)use(o)}function i(i){for(i.k in g())use(i)}function j(){let i=g();for(let o=()=>i;;)use(o)}function k(){let i=g();for(let[o]of i)use(o)}function l(){var i;for(i=g();i;)use(i)}'
			],
			// A value folds past declarations whose values all fold into the statement after, read there first, but not past one declaring a name it leaves unset.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-write-a-value-at-its-one-read-4"),
				{},
				"async function a(n){n(g(),await h())}function b(n){n(g(),h(),k())}function c(n){var f=g();n(h(),f)}function d(n){let f=g();n(f,h(),f)}function e(n){var f=g();let v;n(f,h(),v)}"
			],
			// A `var` a function's body sets to a name nothing writes, read once after it there, reads that name instead, but not read before or in a function, set in a branch, or for a longer name.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-a-var-alias-s-name-in-its-place"),
				{ mangle: false },
				"function a(y){var c=3-y;while(c)return y;return y*y}function b(b,c){if(b)return b;log(c)}function c(c){log(a);var a=c;return a}function d(c,d){if(d)var a=c;return a}function e(c){var a=c;return()=>a}function f(c){var a=c;return c=2,a}function g(c){var a=c;return log(a),a}function h(longer){var a=longer;if(b)log(1);return a}use(c=>b?1:c,function(c){return b?1:c});"
			],
			// A global `const` folds where it is read and stays declared; a `let` or `var` another script may set, and a read before it is set, do not.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-a-global-const-where-it-is-read"),
				{},
				'const MODE="production",ENABLED=!1,name="web";log(name,"web page");let later=1;log(later+1);var some=1;log(some+1),f();const early=2;function f(){return early+1}'
			],
			// An `if` of expressions prints as `?:`, its test parenthesized where it binds looser, first in a statement or not.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-104"),
				{},
				"function f(e,f){e?x():y(),(e=f)?x():y();(function(){})()?x():y();e?x():f?y():(x(),y()),e?f?x():y():z()}"
			],
			// A comment kept on an `if`'s branch or its `return` keeps it, and `conditionals: false` keeps every `if`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-105"),
				{},
				"function f(e){if(e)/*! c */x();else y();if(e){x()/*! d */}else y();if(e)return 1;/*! e */return 2}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-106"),
				{ compress: {toplevel: false,conditionals: false} },
				"function f(f){if(f)x();else y()}"
			],
			// `if (t) return x; return y` prints as one `return`, a sequence parenthesized, but no `return` without a value.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-107"),
				{},
				"function f(n,r){return n?(r,1):2}function g(n){if(n)return 1}function h(n){if(!n)return 1}"
			],
			// An `if` whose test is known false goes, and what only it read with it, but not where its body declares a function or holds a comment kept: a `var` stays declared.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-108"),
				{},
				"function f(f){var i=1;var a;if(0){function n(){}n()}y();if(0)x(/*! c */1);return i+a}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-109"),
				{ compress: {toplevel: false,dead_code: false} },
				"function f(f){if(0)x()}"
			],
			// A conditional whose test is known prints the branch it picks, after `0,` where a call would read a name or member differently, bare where an unread `delete` or `typeof` goes, an object an arrow returns in parentheses, but not what drops a comment kept.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-110"),
				{},
				"function f(o){g(o),g(2),o.x,(0,o.f)(),(0,o.f)``,u,g(o.f),g(1?o:h(/*! c */2));return()=>({})}"
			],
			// So does `&&`, `||` or `??` whose left side is known.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-111"),
				{},
				"function f(o){g(o.f,1,o,1),o.x,(0,o.f)(),g(1||h(/*! c */2))}"
			],
			// A branch that is no expression keeps the `if`, a sequence test is parenthesized, and a dead `if` declaring only in its own scopes goes.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-112"),
				{},
				"function f(f,e){if(f)for(;;)g();else y();(h(),e)?x():y(),g([f])}"
			],
			// A statement that runs nothing goes, but not a directive, a comment kept, a `#__PURE__` call with `side_effects: false` nor a global a `try` probes for.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-113"),
				{},
				"function f(t){\"use strict\";t.b;g;/*! c */3;try{window}catch(t){}}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-114"),
				{ compress: {toplevel: false,side_effects: false} },
				"function f(a){a,g()}"
			],
			// Without mangling it compresses the same, names as written.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-115"),
				{ mangle: false },
				"function f(a){a?x():y(),a-1}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-116"),
				{ mangle: false },
				"function f(a){g(1,3)}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-117"),
				{},
				"function f(n){return n}"
			],
			// A value folds past what reads the same after it runs: a global callee, for a local, `await`, a literal, `this`, a name nothing writes and the stable left of a binary or computed member.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-118"),
				{},
				"async function f(a){h(a,1,this,g()),new K(a,g()),i(await g()),j(a+g()),k(a[g()]),l([a,,g()]),o({x:a,y:g()}),r(g())}"
			],
			// But not past a spread, shorthand, computed key, getter or template part before it, an optional member, a global the value sets, a name something writes, nor where `eval` may read it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-119"),
				{},
				"function f(a){var r=g();h(...a,r);var v=g();h({p:a,b:v});var n=g();h({[a]:1,c:n});var p=g();h({get x(){},y:p});var c=g();h(`${a}${c}`);var e=g();h(a?.[e]);var f=(h=g)();h(f);var t=(h++,g());h(t);var i=g();h(a,i),a=1}function k(){var a=g();h(a),eval(\"\")}function l(){x=g(),h(x)}"
			],
			// Each declarator folds into the next value after it, past one without a value.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-120"),
				{},
				"function f(){let c;j(i(h(g())),c)}"
			],
			// After a body that always leaves, what the `else` holds prints after the `if` where a list holds it, but not a block scoping a name or keeping a comment.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-121"),
				{},
				"function f(e,a){if(e)return 1;a();if(a)return x(),2;y(),z();if(e)throw 1;h(g());while(e&&!a)w();for(;;)if(!e){/*! c */v()}if(!a)e?v():u()}for(;!a;)b();e:if(!a)b();switch(a){case 1:if(b)break;c()}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-122"),
				{},
				"function f(e){if(e)return 1;else{class f{}g(new f)}if(e)return 2;else{function n(){}n()}if(e)return 3;else/*! c */{h()}}"
			],
			// A value `using` or `await using` disposes of folds nowhere.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-123"),
				{},
				"async function f(){await using n=g();h(n)}async function k(){await using n=g(),i=q(n);h(i)}function m(){using n=g();h(n)}"
			],
			// Dividing a bigint by zero or raising it to a negative power throws, so it stays unless the right side is a literal that cannot.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-124"),
				{},
				"function b(n){1n/0n,2n**-1n,1n%0n,1n/n}"
			],
			// A `switch` drops a `break` ending it and a `default` doing nothing last, and a value folds into `import()`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-125"),
				{},
				"function f(c){switch(c){case-1:c=1;break;case 0:c=2}if(c===1)x();if(c===1)y();c:switch(c){case 1:z()}switch(c){case 1:y();/*! c */break}return import(r(c))}"
			],
			// `!!!x` read for its truth folds its innermost `!!` alone; a test swaps its branches for the `!` left.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-126"),
				{},
				"function f(x){if(!x)g();if(x)h();return[x?2:1,!x]}"
			],
			// A parameter `arguments` reads keeps what sets it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-127"),
				{},
				"function f(n){return n=1,arguments[0]}function k(n){n=1;return()=>arguments}function m(n){return function(){return arguments}}"
			],
			// A function called with nothing but names never written passed prints as what it returns.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-128"),
				{},
				"function f(n){return[n.a,n.b,{a:1},(n.c+1)*2]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-129"),
				{},
				"function f(x,e){return[x+e,(x,1)]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-130"),
				{},
				"function f(n,t){n=2;return[(n=>n+1)(n),(n=>()=>n)(t),function(){return this}(),function n(){return n}(),(async()=>1)(),(n=>n)(t,t),(()=>1)()]}"
			],
			// The assignment every branch of a chain ends in prints once, before its test.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-131"),
				{},
				"function f(e,t){t+=e===7?\"a\":e===8?\"b\":e,e()?t+=1:t+=2;return[t,t=e?1:2,e?t=1:t+=2,e?t=1:o.t=2]}"
			],
			// `if`s next to each other leaving alike test as one.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-132"),
				{},
				"function f(t,f,n){for(let f of t){if(f<1||f>9)continue;g(f)}if(t||(f=n)||(t??f))return;if(n)break_();g()}"
			],
			// A conditional `dead_code` folds keeps the assignment of the branch it prints.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-133"),
				{},
				"function f(a){var b=0,r=0;b=1,r=a?2:3;return[b,r]}"
			],
			// A global set alike hoists as a conditional's does, labelled exits alike join; a name nothing mangles prints as written.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-134"),
				{},
				'var t;t=a===1?"x":"y";function f(a){X=a?1:2;a:for(;;){if(a||!a)break a;g()}}'
			],
			// A function declaration read once before it prints there, but in a loop.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-135"),
				{},
				"function f(t){return t.exports=function(){return g()},t}function k(t){for(var n=0;n<2;n++)t.push(r);function r(){}return t}function m(t){t.a=function(t){return n(t)};var n=h();return t}"
			],
			// One holding a function moved after the read stays, until a reprint.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-136"),
				{},
				"function f(n){n.e=t;function t(){return h(),g(1)}return n}"
			],
			// One printed first inside another printed first prints where that one does.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-137"),
				{},
				"function f(){function n(){return x()}return n()}"
			],
			// What only unread code reads goes, though it would print first.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-138"),
				{},
				"function f(){}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-139"),
				{ compress: { toplevel: true }, mangle: { toplevel: true } },
				"u();function u(){return g()}"
			],
			// One reading its own `arguments` keeps one identity across calls.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-140"),
				{},
				"function f(){function n(){return r()}function r(){return arguments.callee}function t(){return()=>1}return[n(),n(),t(),t()]}"
			],
			// A literal of constants folds into its read where that runs once.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-141"),
				{},
				'function f(e,n){return e(n,{negated:!1,prefix:""})}function k(e){let n=[1,["a"]];return e.map(()=>n)}function m(){let e={};return delete e}'
			],
			// Literals a string adds join; an operation folds in bare where it may.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-142"),
				{},
				'function f(r,e){var b="(?:"+r+"|"+e+")"+"?";return[b+b,r+1+"a true",r+"a1"]}'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-143"),
				{},
				"function a(n,c){return 10-(n-c)}function d(n,c){return n-c-10}function e(n,c){return(n+c)*2}function h(n,c){return(n??c)||3}function k(n,c){return(n**c)**2}function l(n,c){return(n+c)(1)}function m(n,c){return(n&&c).x}function n(n,c){return g(n+c,1)}function o(n,c){throw n+c}function p(n,c){return[n+c]}function q(n,c){return`${n+c}`}function r(n,c){return n+c?1:2}function s(n,c){return{x:n+c}}function t(n,c){var r=n+c;return{[r]:1}}function v(n,c){var r=n+c;return[...r]}function w(n,c){return new G(n+c)}function x(n,c){return function(){}+c}function y(n,c){return n+c}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-144"),
				{},
				"function f(n){let t=[1,,g()];return[n.y,t]}function k(n){let t={...n};return[n.y,t]}function m(n){let t={get x(){return 1}};return[n.y,t]}function o(n){let t={[n]:1};return[n.y,t]}function p(n){let t={f(){}};return[n.y,t]}function q(n){let t=[1];return[n.y,/*! c */t]}function r(n){let t=[1];return[n.y,delete t]}function s(n){let t=[1];return[n.y,()=>t]}function t(n){return[n.y,[1,,2]]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-145"),
				{},
				"function u(c,n){return(c||n)??1}function z(c,n){return c+n}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-146"),
				{},
				"!function(){n();function n(){console.log(g())}}();"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-147"),
				{},
				"function f(e){return[typeof(0,undeclaredX),delete(0,e.p),(0,e.m)()]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-148"),
				{},
				"function f(n){return[(0,n.m)(),typeof(0,undeclaredY)]}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-149"),
				{},
				'function f(a){const k=1;let r=[k+1,(n=>1)(later),function(){return eval("a")}(),function(){return()=>this}(),function(){return()=>arguments}()];const later=2;return r}'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-150"),
				{},
				'function f(a,b,o){o.x=b;({a:g()});g(a+b),new G(a-b),o.y=a*b,o[a+b]=1;return[`${a+b}`,...[a],{p:a+b,[a|b]:1},"s",`t${a}`,-a]}'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-151"),
				{},
				"function f(){return[function(){g()}(),void 0,function(){return new.target}(),class{},function(){return 1},function n(){return function(){return n}}(),function(){return 1}]}class A extends B{m(){return(()=>super.m())()}}function h(n,t){throw n+t}function k(n,t){var r=n%t;g(r),g(r)}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-152"),
				{},
				"function f(n){return[(n=>n)(/*! a */n),function(){/*! b */return n}(),function(n){return n.a}(/*! c */n)]}"
			],
			// Not mangled, the definitions still merge the assignments.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-153"),
				{ mangle: false },
				"function f(c){var a;return a=c?1:2,a}"
			],
			// A call prints as its value only where what it passes prints as named.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-154"),
				{},
				"g(function(n){return n()}(function(){return 7})+3),g(9),g(function(n){return n.v}({v:5})+3);"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-155"),
				{ compress: {toplevel: false,builtins_ecma: 2020},format: {comments: false} },
				"function f(f){}"
			],
			// A function or constant read as a shorthand prints as its value.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-156"),
				{},
				"function m(o){return{add:function(n){o.x(n)},stop:function(){o.y()}}}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-157"),
				{},
				"function m(n){return{dot:\"\\\\.\",end:\"(?:\\\\/|$)\",ends:n+\"(?:\\\\/|$)\"}}"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-158"),
				{},
				"function m(){return{[\"__proto__\"]:1}}"
			],
			// A known test prints the branch it picks, a block in its list.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-159"),
				{},
				"function f(){a(),b();e(),g();h()}"
			],
			// An arrow's chain opening with an object is parenthesized past what goes.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-160"),
				{},
				"g(r=>({}.a?1:2));"
			],
			// A value printed where a read opening a statement was keeps its parentheses.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-161"),
				{},
				"function f(){({}.a?g():h());(function(){}.call()?g():h());({}.a?g():2),g()}"
			],
			// A function declared as the branch kept declares it only once that runs.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-162"),
				{},
				"g(function(){g(typeof f);if(1)function f(){}if(!0)function n(){}g(f,n)});"
			],
			// With shorthands, a name printing otherwise than its key prints after it.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-163"),
				{ ecma: 2015 },
				"function m(o){var _=g(),b=h(),a=g();return{add:_,b,f:function(_){o.x(_)},c:`x`,[\"__proto__\"]:a}}"
			],
			// A function expression's name that goes takes no name from its scope.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-164"),
				{},
				"function m(o){var n=function(o,n){this.label=o,this.options=n};return[new n(o,1),new n(o,2)]}"
			],
			// A value folded into its one read takes the parentheses that read needs.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-165"), {}, "function f(a){return(!a).x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-166"), {}, "function f(a){return(-a)(1)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-167"), {}, "function f(a){return(-a)**2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-168"), {}, "function f(a){return 2**-a}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-169"), {}, "function f(a){return[-a]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-170"), {}, "function f(a,c){return c[a+1]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-171"), {}, "function f(a,n){return[a+1]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-172"), {}, "function f(n){(function(){}.x+n),g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-173"), {}, "function f(){({}.x=1),g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-174"), {}, "function f(a){({x:a()}).y,g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-175"), {}, "function f(a){return class{}.name}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-176"), {}, "function f(n){(function(){return n}).call()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-177"), {}, "function f(a){({}.x+1),g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-178"), {}, "function f(a){return\"x\"+(a+1)+\"y\"}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-179"), {}, "function f(a){return`${a+1}`}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-180"), {}, "function f(n){(function(){}).x=n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-181"), {}, "function f(n){return function(){}.x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-182"), {}, "function f(a){return a&&c?1:2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-183"), {}, "function f(a){return-a?1:2}"],
			// A sequence a declarator set prints bare where a `return`, `throw` or sequence reads it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-184"), {}, "function f(a){g((a(),1))}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-185"), {}, "function f(a){return 1}"],
			// An item that may print as a sequence itself keeps the parentheses, as an argument would split.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-186"), {}, "a=\"PASS\",console.log({a:\"FAIL\",b:function(){return function(n){return n.a}((String,Object,function(){return this}()))}}.b());"],
			// One item left of it printed bare, so a `return` takes it whole.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-187"), {}, "function f(a,c){return(c+1).x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-188"), {}, "function f(a){throw 1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-189"), {}, "function f(a){return 1,2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-190"), {}, "function f(a){return(1).x}"],
			// A test known to be pure goes with the branch it never takes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-191"), {}, "function f(){}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-192"), {}, "function f(){}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-193"), {}, "function f(){g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-194"), {}, "function f(){g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-195"), {}, "function f(){return b()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-196"), {}, "function f(){g()}"],
			// `if` chains returning print as one `return t?x:y`, booleans as `!`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-197"), {}, "function f(e,r){return e?1:r?2:3}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-198"), {}, "function f(n){return!!n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-199"), {}, "function f(e){return!e}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-200"), {}, "function f(r,e){return r?!0:e?1:!1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-201"), {}, "const f=(r,n)=>({}.x?1:n?2:3);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-202"), {}, "function f(r,n,f){return r?n?1:f?4:2:3}"],
			// So do chains throwing, esbuild's `throw t?x:y`; one mixing `return` and `throw`, a body not one `throw`, or an exit dead code drops keeps its `if`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-203"), {}, "function f(o,t){throw o?1:t}function g(){throw a?b():c()}function h(){throw a?b:c?d:e}function i(){throw a?b:c}function j(){throw a?(b,c):d}function k(){throw a,b}f=()=>{throw a?b:c};"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-204"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-204")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-205"), { format: { comments: "all" } }, "function f(){return 1;if(d)/*j*/return e}function h(){throw 1;if(d)/*j*/throw e}"],
			// An empty statement prints nothing, a block of only those as `;`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-206"), {}, "function f(f){if(!f)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-207"), {}, "while(a);"],
			// A `RegExp` built from constants that parse goes unused; one that throws stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-208"), {}, "function m(){f()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-209"), {}, "function m(){RegExp(\"[\"),RegExp(\"a\",\"q\")}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-210"), {}, "function m(e){new e(\"a\")}"],
			// A `var` set after a call folds where its function reads it after the declaration.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-211"), {}, "function m(){f(),g(\"hello!\")}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-212"), {}, "function m(){g(e+\"!\");var e=\"hello\"}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-213"), {}, "function m(){f()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-214"), {}, "function m(){f(),g(\"x(?:d|ll|m|re|s|t|ve)?\",\"y(?:d|ll|m|re|s|t|ve)?\",\"(?:d|ll|m|re|s|t|ve)?\")}"],
			// A fold weighs the operands as printed, a string's run joined.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-215"), {}, "f(x+\"ab1\");"],
			// A hundred strings print as one string split on a delimiter none holds.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-216"), {}, "g(\"w0.w1.w2.w3.w4.w5.w6.w7.w8.w9.w10.w11.w12.w13.w14.w15.w16.w17.w18.w19.w20.w21.w22.w23.w24.w25.w26.w27.w28.w29.w30.w31.w32.w33.w34.w35.w36.w37.w38.w39.w40.w41.w42.w43.w44.w45.w46.w47.w48.w49.w50.w51.w52.w53.w54.w55.w56.w57.w58.w59.w60.w61.w62.w63.w64.w65.w66.w67.w68.w69.w70.w71.w72.w73.w74.w75.w76.w77.w78.w79.w80.w81.w82.w83.w84.w85.w86.w87.w88.w89.w90.w91.w92.w93.w94.w95.w96.w97.w98.w99\".split(\".\"));"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-217"), {}, "g([\"w0.,() \",\"w1.,() \",\"w2.,() \",\"w3.,() \",\"w4.,() \",\"w5.,() \",\"w6.,() \",\"w7.,() \",\"w8.,() \",\"w9.,() \",\"w10.,() \",\"w11.,() \",\"w12.,() \",\"w13.,() \",\"w14.,() \",\"w15.,() \",\"w16.,() \",\"w17.,() \",\"w18.,() \",\"w19.,() \",\"w20.,() \",\"w21.,() \",\"w22.,() \",\"w23.,() \",\"w24.,() \",\"w25.,() \",\"w26.,() \",\"w27.,() \",\"w28.,() \",\"w29.,() \",\"w30.,() \",\"w31.,() \",\"w32.,() \",\"w33.,() \",\"w34.,() \",\"w35.,() \",\"w36.,() \",\"w37.,() \",\"w38.,() \",\"w39.,() \",\"w40.,() \",\"w41.,() \",\"w42.,() \",\"w43.,() \",\"w44.,() \",\"w45.,() \",\"w46.,() \",\"w47.,() \",\"w48.,() \",\"w49.,() \",\"w50.,() \",\"w51.,() \",\"w52.,() \",\"w53.,() \",\"w54.,() \",\"w55.,() \",\"w56.,() \",\"w57.,() \",\"w58.,() \",\"w59.,() \",\"w60.,() \",\"w61.,() \",\"w62.,() \",\"w63.,() \",\"w64.,() \",\"w65.,() \",\"w66.,() \",\"w67.,() \",\"w68.,() \",\"w69.,() \",\"w70.,() \",\"w71.,() \",\"w72.,() \",\"w73.,() \",\"w74.,() \",\"w75.,() \",\"w76.,() \",\"w77.,() \",\"w78.,() \",\"w79.,() \",\"w80.,() \",\"w81.,() \",\"w82.,() \",\"w83.,() \",\"w84.,() \",\"w85.,() \",\"w86.,() \",\"w87.,() \",\"w88.,() \",\"w89.,() \",\"w90.,() \",\"w91.,() \",\"w92.,() \",\"w93.,() \",\"w94.,() \",\"w95.,() \",\"w96.,() \",\"w97.,() \",\"w98.,() \",\"w99.,() \"]);"],
			// Setting a `const` throws, so the write stays though nothing reads it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-218"), {}, "function m(){const n=2;return n=1,3}"],
			// A `const` set to `undefined` prints as a `let` without it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-219"), {}, "function f(){let c;g(c),g(c)}"],
			// `-Infinity` prints `-1/0` where a division reads as one value there.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-220"), {}, "function f(){return-1/0}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-221"), {}, "function f(n){return[n/-(1/0),-1/0/n,(-(1/0)).x]}"],
			// `false` read off and a boolean constructed print shorter in parentheses, `undefined`
			// read off too, an arrow returning it returns nothing, and a class field reads it as `void 0`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-222"), {}, "x=[(!1).toString(b),new(!0),new(!1)(1),true.x,(void 0).x],y=()=>{};class A{u=void 0;static v=void 0}"],
			// oxc's `()=>void 0` as `()=>{}`, but where the `void` runs something.
			[fixture("javascript", "one-pass-spelling-b-1"), {}, "x=[()=>{},()=>{},()=>{},d=>{},()=>void f(),()=>g];"],
			// A run of `|`, `&` or `^` with one operand not constant folds its constants, but where
			// two operands not constant sit between them, evaluated before converted.
			[fixture("javascript", "one-pass-spelling-b-2"), {}, "x=[a|3,a&0,a^2,a|7,1|b()|c()|8,a&-2,1|a|b|2,a|1,(a,b)|3];"],
			// A string's index reads its code unit, and its `concat` prints as a template, its constants
			// as text, but where one converted after evaluating another could tell.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-223"), {}, "x=[\"b\",\"b\",void 0,void 0,\"\\ude00\",\"abc\"[1]()];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-224"), { ecma: 2020 }, "y=`translate(${o.x}, ${o.y})`,z=[`${a}1truenull`,`a${b}${c}`,`a`.concat(b,c),`a`.concat(...b),a.concat(b),`a`.concat?.(b)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-225"), {}, "String.prototype.concat=f,x=\"a\".concat(b);"],
			// What reading throws no more than `typeof` compares to `void 0`, but a name no declaration binds.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-226"), {}, "function f(e){return[e===void 0,e.b!==void 0,g()!==void 0,typeof c>\"u\"]}"],
			// Past `typeof o=="object"`, `o` is an object or `null`, so `null` only where falsy.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-227"), {}, "function f(o,t){if(\"object\"==typeof o&&o)g();return[\"object\"==typeof o&&!!o,\"object\"!=typeof o||!o,\"object\"==typeof o&&t!==null,\"function\"==typeof o&&o!==null]}"],
			// Nobody reading it, a string added keeps only the other side's conversion, and a template one for each run.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-228"), {}, "\"\"+f(),g()+\"\",\"\"+h(),`${b}${d}`,a=1,`${b}`;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-229"), {}, "v=function(a,b){\"\"+ +b,\"\"+ ++b,b+++\"\"};"],
			// A branch a known test drops declares its `var`s still, without their values, each named apart.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-230"), {}, "function f(){var r=2;var e;return[e,r]}function g(){h();var e,r,n;return[e,r,n]}"],
			// A name the dropped branch declares again keeps the value set before it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-231"), {}, "function f(){var r=7;if(0)var r=5;return r}"],
			// A name only the dropped branch reads is declared for nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-232"), {}, "function f(){return g(),1}"],
			// A truth known though it runs something decides: past `x()||1` the right side runs, `x()&&0` is the value,
			// and a constant inside a chain of the same operator goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-233"), {}, "f((x()||!0,y())),f(x()&&0||y()),f(x()&&0),f(x()&&y),f(a&&b),f(a||null),f(a&&b),f((foo,b())),f((g(),a)),(x=c)(),y();"],
			// De Morgan's laws: a `!` goes into `&&` or `||` where its operands cost less negated, the value staying a boolean,
			// but where a test swaps its branches instead or another `!` takes it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-234"), {}, "f(a!=b&&c!=d),f(!a||!b),f(a!=b&&!g(c)),f(!(x&&!a&&!b)),x=a!=b&&c!=d&&e,x=(a!=b||c!=d)&&e,x=a!=b||c!=d||e,x=e??(a!=b&&c!=d),x=-(a!=b&&c!=d),x=a==b||c==d?2:1,x=a||b?d:c,f(!(!a||b));while(x||y)g();for(;!a&&!b;)g();if(a!=b&&c!=d)throw x;"],
			// A sequence left one item where any expression stands bare drops its parentheses, but where it names a function.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-235"), {}, "x=6;let y=a[b];f(2,...c),z=[()=>1],w={a:(1,b?c:d),[e]:1,b:(1,()=>1),c:(1,class{})},v=`${a}`,u=(1,()=>1);for(var t=(1,a in b);;);"],
			// A number too big for a double is no name: a binding named `Infinity` does not read it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-236"), {}, "function f(Infinity){eval(\"\");return[1/0,-1/0,(1/0).x,1/0]}"],
			// A body printing nothing is `;`, and an `if` with one only runs its test.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-237"), {}, "function f(f){for(f of b);while(f());}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-238"), {}, "function f(f){f();if(!f)b()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-239"), {}, "function f(f){if(f)a();else b()}"],
			// `!t?a:b` is `t?b:a`, but where the test would open a statement.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-240"), {}, "function f(a){return[a?c:b,a||b?d:c,--a?c:b,a?b:c]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-241"), {}, "function f(f){f?c():b()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-242"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-242")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-243"), {}, "function f(n){return n?g(n):2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-244"), {}, "function f(n){return n?c:(a,b)}"],
			// A test already a boolean takes no `!!`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-245"), {}, "function f(n){return!n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-246"), {}, "function f(n){return n>1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-247"), {}, "function f(n,a){return n instanceof a}"],
			// Writing a function runs nothing, so its `typeof` is known.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-248"), {}, "function f(){return[\"function\",\"function\"]}"],
			// A call prints as the value returned where the rest of the body prints nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-249"), {}, "function f(r){var n=r.push(3);return[n,n]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-250"), {}, "function f(r){var n=r.push(3);return[n,n]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-251"), {}, "function f(n){return(0,n.m)()}"],
			// A name of the function the value would print as stays inside it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-252"), {}, "function f(){var r=function(){var r;return r}();return[r,r]}"],
			// `if(t)return;x` ending a function is `if(!t)x`, and a guarded `if` continues the test.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-253"), {}, "function f(f,n){if(!f&&n)return 1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-254"), {}, "function f(f,b){if((f||b)&&b)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-255"), {}, "function f(f){if(!f)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-256"), {}, "function f(f){if(!f)g(),h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-257"), {}, "function f(e,f){if(!e){if(f)return 1;g()}}"],
			// A test giving a boolean picks a branch as `||` or `&&` would.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-258"), {}, "function f(a,b){return[a==b||x,!a||x,a<b&&x]}"],
			// `a ? x : true` is `!a || x` whatever `a` is, `a ? x : false` stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-259"), {}, "function f(a){return[!a||x,a?x:!1]}"],
			// What runs nothing in a sequence goes, its last value where nothing reads it, but where one left would read as another.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-260"), {}, "function f(n,o){for(;n;n--)a(),b();return[o.m,(0,o.m)(),(a(),1)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-261"), {}, "function f(r,a){return[r.x(a),r.b.c,(1,2).x,(0,let).x]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-262"), {}, "function f(){0,{}.a.b,a(),{}.a.b}"],
			// A `!` the compressor adds before an equality flips its operator, one written stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-263"), {}, "function f(a,b){if(a===b)h(a!=b||x,a!==b&&x,a!=b)}"],
			// A body of expressions prints as one sequence, without braces.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-264"), {}, "function f(f){if(f)a(),b();else c();while(f)a(),b();if(f)a(),function(){if(f)b();c()}()}"],
			// asm.js keeps its statements and sequences as written.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-265"), {}, "function m(){\"use asm\";return function(a){if(a=a|0){a=a+1|0;a=(0,a+2)|0}return a|0}}"],
			// An arrow of expressions ending in a `return` of a value prints as their sequence.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-266"), {}, "function f(){return[r=>(a(),b),r=>(a(),b(),{c:1}),r=>{a();var n;return n}]}"],
			// A guard takes any one statement but a labeled one, or an `if` printing its kept branch.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-267"), {}, "function f(r){if(!r)throw g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-268"), {}, "function f(f){if(!f)for(;;)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-269"), {}, "function f(f,n){if(!f)for(var o in n)g(o)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-270"), {}, "function f(f,o){if(!f)for(var r of o)g(r)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-271"), {}, "function f(a){if(!a)while(a)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-272"), {}, "function f(a){if(!a)do{g()}while(a)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-273"), {}, "function f(a){if(!a)if(a===1)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-274"), {}, "function f(t){if(!t)try{g()}catch(t){}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-275"), {}, "function f(f){if(!f){g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-276"), {}, "function f(f){if(!f)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-277"), {}, "function f(n){!function(n){if(!n&&g(n))return}(n)}"],
			// `if(!t)x;else y` swaps inside the `?:` it is a branch of.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-278"), {}, "function f(e){e?a?c():b():d()}"],
			// What no literal reads of itself stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-279"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-279")],
			// An arrow's sequence is its expressions and the value returned, nothing after.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-280"), { compress: { dead_code: false } }, "f=r=>{return a(),b;g()};"],
			// Joined into a `return` taking a space more, an `if` body drops its braces, unless more prints after it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-281"), { compress: { dead_code: false } }, "function x(){if(c)return a(),b(),!1;if(d){k();return!1;g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-282"), {}, "f=r=>{a()};"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-283"), {}, "f=r=>(a(),b);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-284"), { compress: { side_effects: false } }, "function f(n){return[(g(),0,h()),(0,a).b]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-285"), { compress: false }, "f=r=>{a();return b};g((0,a).b);"],
			// A value read through a constant, a parameter or a collapsed write prints in the call's place.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-286"), {}, "function f(){var r=g(2);return[r,r]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-287"), {}, "function f(r){var n=r.y();return[n,n]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-288"), {}, "function f(){var r=c.push(3);return[r,r]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-289"), {}, "function f(r){var n=function(r){var n;return n}(r);return[n,n]}"],
			// A name the function declares whose reads print its value is no name the call reads.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-290"), {}, "function f(){var r={p:1};return[r,r]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-291"), {}, "function f(r,n){var v=g(n);return[v,v]}"],
			// A statement printing nothing between guards keeps them apart.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-292"), {}, "function f(f,i){if(!f&&i)g()}"],
			// A function no longer moving to its one read keeps its call.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-293"), {}, "function f(){n();function n(){x()}}"],
			// A sum is no boolean, so `a ? x : false` stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-294"), {}, "function f(n,a){return n+a?x:!1}"],
			// A `!` test keeps the parentheses of what a folded or called test prints as where they are its own.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-295"), {}, "function f(b){return[(a=b)?d:c,(x(),b)()?d:c]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-296"), {}, "function g(n){return n.a&&n.b?b():a()}"],
			// `!!x` read for its truth prints as `x`, so it gives no boolean to return.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-297"), {}, "function f(x,n){return[x?!0:n,x?n:!1,!!x]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-298"), {}, "function f(n){return!!n}"],
			// A statement printing nothing, as a call nothing reads of a function doing nothing, joins no sequence.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-299"), {}, "function f(f,i){if(f)i(),i()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-300"), {}, "f=n=>(g(),n);"],
			// A statement after the first that printed its own parentheses keeps the body's braces.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-301"), {}, "function k(p,u){if(u)p.push(3),function(p,u){p.push(this),p.push(2)}(p);return p}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-302"), {}, "function k(p,u){if(u)p.push(3),p.push(1),p.push(2);return p}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-303"), {}, "f=r=>{a(),{}.b=r;return 1};"],
			// An object opening an optional chain a statement opens with keeps its parentheses.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-304"), {}, "({m(){}}).m()?a():b();"],
			// A heritage the call prints as needs no parentheses.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-305"), {}, "class C extends B{}"],
			// What a literal written in place reads of itself is known, but where a call, tag or `delete` reads it as a reference.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-306"), {}, "function f(e){return[3,4,[g()].length,\"a\\\\/b\",2..x,\"ab\".length(),\"ab\".length``,delete\"ab\".length]}"],
			// A name set to a stable value folds past a member callee, whose getter cannot change it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-307"), {}, "function f(f,o){f.f(o)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-308"), {}, "function f(f,x){var n=x;n.f(n)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-309"), {}, "function f(f,o){var n=o.q;f.f(n)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-310"), {}, "function f(n,o){new n.F(o)}"],
			// A pure trailing argument to a parameter nothing reads, or to none, goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-311"), {}, "function f(){function n(n,g){return n}return[n(1),n(x,y()),n(1),n(...z,1)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-312"), {}, "function f(n){n.p;function r(n,r){return n}return[r(x),r(y)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-313"), {}, "function f(){function n(n,...r){return n}return[n(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-314"), {}, "function f(){function n(n,r){return arguments}return[n(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-315"), {}, "function f(){function n(n,r=1){return n}return[n(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-316"), {}, "function f(){function n(n,r=arguments[2]){return[n,r]}return[n(1,2,3),n(5)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-317"), {}, "function f(){function n(n,g){return n}return[(n=h)(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-318"), {}, "function f(){function n(n,r){return n}return[n(1,/*! keep */2),n(3)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-319"), {}, "function f(){function n(n,r){return n}return[n(1,[1,/*! keep */2]),n(3)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-320"), {}, "function f(){function n(n,r){return n}return[n(1,()=>/*! keep */2),n(3)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-321"), {}, "function f(){function n(n,r){return n}return[n(1,/*! keep */n=>2),n(3)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-322"), {}, "function f(){function n(n,r){return n}return[n(1,/*! keep */n=>n=>2),n(3)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-323"), {}, "function f(){function n(n,r){return n}return[n(1),n(3)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-324"), {}, "function f(){function n(n,r){return n}var n;return[n(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-325"), {}, "function f(){function g(n,t){return n}return[g(1,2),g(3,4)];function h(){eval(\"\")}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-326"), {}, "function f(){function n(n,r){return n+r}return[n(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-327"), {}, "function f(){function n(n,{b:r}){return n}return[n(1,2),n(3,4)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-328"), {}, "function f(){function n(n,/*! keep */r){return n}return[n(1,2),n(3,4)]}"],
			// A literal of literals passed to a parameter read once, not in a loop, prints at the read.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-329"), {}, "function f(){g({a:1}.a)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-330"), {}, "function f(){return{a:1}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-331"), {}, "function f(){return[1,,-1,\"s\",{b:!0}]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-332"), {}, "function f(){!function(o){for(;;)g(o)}([1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-333"), {}, "function f(){}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-334"), {}, "function f(){!function(o){g(o,o)}([1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-335"), {}, "function f(){!function(n){g(n)}([h])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-336"), {}, "function f(){!function(n){g(n)}({h:h})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-337"), {}, "function f(){!function(n){g(n)}({h(){}})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-338"), {}, "function f(){!function(n){g(n)}({[h]:1})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-339"), {}, "function f(){!function(n){g(n)}({get h(){return 1}})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-340"), {}, "function f(){g([/a/])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-341"), {}, "function f(){!function(o){g(o,[1])}([2])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-342"), {}, "function f(){!function(n){g(arguments)}([1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-343"), {}, "function f(){!function(o){g(o),o=1}([1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-344"), {}, "function f(){g({a:[1,{b:-1}]})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-345"), {}, "function f(){!function(n){g(n)}([`t${h}`])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-346"), {}, "function f(){!function(){g({a:1}.a)}(h())}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-347"), {}, "function f(){}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-348"), {}, "function f(){h(),g({a:1})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-349"), {}, "function f(){h(function(){}),g([1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-350"), {}, "function f(){!function(o){g([1],o)}(h)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-351"), {}, "function f(){!function(n){class o{x=n}g(new o,new o)}([1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-352"), {}, "function f(){g([1]),g([2])}"],
			// A `join` of constants, an empty block and a loop on a truthy constant print shorter or not at all.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-353"), {}, "function f(){g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-354"), {}, "function f(){[1,g()].join(),h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-355"), {}, "x=[1,/*! c */2].join();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-356"), {}, "function f(){g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-357"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-357")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-358"), {}, "function f(){for(;;)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-359"), {}, "function f(){for(;;)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-360"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-360")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-361"), {}, "function f(){}"],
			// An assignment of the name its value reads first prints compound.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-362"), {}, "function f(x){g(x+=1)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-363"), {}, "function f(x){h(x>>>=g())}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-364"), {}, "function f(x){h(x-=a-b)}"],
			// The parentheses only the operator needed go with it; a sequence or a call keeps them.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-365"), {}, "function f(x,e,n){x.name+=e-1,n*=a+b,n+=c?1:2,n+=y=2,n|=a||b,n+=a*b,n+=(a,b),n+=(f||g)(1),h(n+=a-b)}function*g(x){h(x+=yield)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-366"), {}, "function f(x){h(x=y+x)}"],
			// A member of `this` or of a declared name, read again in its value, is set by `op=`; a global, a computed key, `with` or `?.` keeps it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-367"), {}, "function f(o){o.p+=1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-368"), {}, "class A{m(){this.x+=v,this.#o*=2}#o}o.y=o.y+1;var q;q.y=q.y+1;function f(o,p){o[k]=o[k]+1,o.y=o.z+1,o.y=p.y+1,o.y=o?.y+1;with(p)p.y=p.y+1}function g(o,y){o.b.c=o.b.c+1,({a:a}=y+1)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-369"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-369")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-370"), {}, "function f(x){h(x=x&&1)}"],
			// An unread catch binding goes; `a?a:b` of a local prints `a||b`; equal unary branches fold.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-371"), {"ecma": 2020}, "function f(){try{g()}catch{h()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-371"), {}, "function f(){try{g()}catch(c){h()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-372"), {"ecma": 2020}, "function f(){try{g()}catch(c){h(c)}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-373"), {"ecma": 2020}, "function f(){try{g()}catch(r){eval(`h(r)`)}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-374"), {"ecma": 2020}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-374")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-375"), {"ecma": 2020}, "function f(){try{g()}catch(c){c=1}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-376"), {}, "function f(a,n){return a||n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-377"), {}, "function f(a,c){return a&&c}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-378"), {}, "function f(a){return a}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-379"), {}, "function f(a,n){return a?a:n?1:2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-380"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-380")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-381"), {}, "function f(a,n){return a?a:1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-382"), {}, "function f(a,n){return a?a:n??1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-383"), {}, "function f(a,n){return a||n||1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-384"), {}, "function f(a,n){return a||n&&1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-385"), {}, "function f(a,n){return(a||n)??1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-386"), {}, "function f(a,n){return a?a:1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-387"), {}, "function f(a,n){return a?a:()=>1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-388"), {}, "function*f(a,n){return a?a:yield}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-389"), {}, "function f(n){return a||n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-390"), {}, "function f(o,n){return o.a?o.a:n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-391"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-391")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-392"), {}, "function f(a,n){return a&&n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-393"), {}, "function f(a,b){x(a||b)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-394"), {}, "function f(n){return-1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-395"), {}, "function f(o,n){return typeof n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-396"), {}, "function f(n,o){return-o}"],
			// A block scoping no name prints its statements in the list holding it, unless one becomes a directive.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-397"), {}, "function f(){var f=g();h(f)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-398"), {}, "function f(){g();h(),k();m()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-399"), {}, "function f(){h(g());h(k())}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-400"), {}, "function f(){{function n(){}h(n)}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-401"), {}, "function f(){{class c{}h(c)}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-402"), {}, "function f(){g();h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-403"), {}, "x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-404"), {}, "function f(){h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-405"), {}, "function f(c){if(c===1)h(g())}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-406"), {}, "function f(){a:g();h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-407"), {}, "function f(){if(a){g();h()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-408"), {}, "function f(){for(;;){g();h()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-409"), {}, "function f(){if(a)return 1;return 2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-410"), {}, "x={};"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-411"), {}, "function f(){var a=1;var b=2;h(a,b)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-402"), {"compress": {"side_effects": false}}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-402")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-412"), {"compress": {"side_effects": false}}, "{\"use strict\";g()}x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-404"), {"compress": {"side_effects": false}}, "function f(){{\"use strict\"}h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-413"), {"compress": {"side_effects": false}}, "function f(){{\"use strict\";g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-414"), {"compress": {"side_effects": false}}, "function f(){{`use strict`,g()}h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-415"), {"compress": {"side_effects": false}}, "function f(){{;\"use strict\";g()}h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-416"), {"compress": {"side_effects": false}}, "function f(){{\"use strict\"}g();h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-417"), {"compress": {"side_effects": false}}, "function f(){g();\"x\";h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-418"), {}, "function f(){g();a();/*! keep */h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-419"), {}, "{/*! keep */}x();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-420"), {}, "function f(){for(k in o){var f=5;while(--f>0)g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-421"), {}, "function f(){if(a)g(),h()}"],
			// A `continue` ending its own loop's body goes, one naming that loop's label too; a commented one stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-422"), {}, "function f(){while(foo)x(),y()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-423"), {}, "function f(){do{x()}while(a)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-424"), {}, "function f(){for(k in o);}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-425"), {}, "function f(){for(;;){x();continue;/*! c */}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-426"), {}, "function f(){while(a)x()}"],
			// A `switch` of one case prints as an `if`, but one a `break` leaves, labelled or not in a list.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-427"), {}, "function f(){if(foo===\"bar\")baz()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-428"), {}, "function f(){if(foo===\"bar\")baz()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-429"), {}, "function f(){if(foo===1)baz();h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-430"), {}, "function f(){foo,baz()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-431"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-431")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-432"), {}, "function f(){switch(foo()){case g():let c=1;h(c)}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-433"), {}, "function f(){if(a===1)b(),c()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-434"), {}, "function f(){if(a===1)return b}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-435"), {}, "function f(){if(a===1)b()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-436"), {}, "function f(){if(a===1)b();else c()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-437"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-437")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-438"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-438")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-439"), {}, "function f(){if(c){if(d===1)if(a)b()}else e()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-440"), {}, "function f(){if(c){if(d===1)b()}else e()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-441"), {}, "function f(){for(;;)d}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-442"), {}, "function f(){c:switch(d){case 1:x()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-443"), {}, "function f(){d}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-444"), {}, "function f(){if(d===1){for(k in o)break;g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-445"), {}, "function f(){if(d===1)/*! k */g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-446"), {}, "function f(){d}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-447"), {}, "function f(){if(-x===typeof y)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-448"), {}, "if(a===1)var x=1;console.log(x);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-449"), {}, "function f(){if(d===1)a?b():c()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-450"), {}, "function f(){if(d===1)h(g())}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-451"), {}, "function f(){switch(d){case 1:function c(){}c()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-452"), {}, "function f(){for(;;)d}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-453"), {}, "function f(){a:for(;;){if(d===1)break a;g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-454"), {}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-454")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-455"), {}, "function f(){x()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-456"), {"compress": {"side_effects": false}}, "function f(c){if(c===1)g();return c}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-457"), {"compress": {"dead_code": false}}, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-457")],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-458"), {}, "function f(){if(g()===2)h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-459"), {}, "function f(){if(g()===2){}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-460"), {}, "function f(t){switch(t){case t:let t=2;return t}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-461"), {}, "function f(n){switch(n){case typeof t:n:function t(){}return 1}return 2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-462"), {}, "function f(){{f:function f(){}}g(typeof f)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-463"), {}, "if(b===2)if(a===2)foo();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-464"), {}, "if(a){if(c)if(b===2)if(a===2)foo();b()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-465"), {}, "if(c)switch(d){case 1:x()}else y();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-466"), {}, "if(p){if(c)if(d===1)x()}else z();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-467"), {}, "if(b===2)switch(a){case 2:foo();break;case 3:g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-468"), {}, "if(c)if(d===1)if(a)b();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-469"), {}, "x=(n,!0),y=(a(),!1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-470"), {}, "function f(n,f=!0){return!1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-471"), {}, "n,f();while(n,x);do{}while(n,x);switch(n,x){case 1:f();break;case 2:g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-472"), {}, "function f(n){if(n)x(),z();else y()}function g(n){if(n)x();else return y()}function h(n){if(n)x();else if(b)c()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-473"), {}, "for(;;)b?x():y();do{b?x():y()}while(t);for(;;)if(!b)y();while(c)if(!b)y();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-474"), { format: { semicolons: false } }, "function f(f){if(f)x()\nelse y()}"],
			// Each keeps its exit: a label, a comment, an inner `if`, a declaration, more after, a kept test, a value returned.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-475"), { format: { comments: "all" } }, "for(;;){if(b){x();continue}y()}for(;;){if(b){x();/*c*/continue}y()}for(;;){if(b){if(c)x();continue}y()}for(;;){if(b){x();continue}function q(){}q()}for(;;){if(b){x();continue}y(),y()}function f(){x()}function g(n){if(n)return x(),1;y()}for(;;)if(!b)y();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-476"), { format: { comments: "all" } }, "for(;;)b?x():y();function f(n){if(n){x();return}/*c*/y()}function g(n){if(n)x();else if(n)x()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-477"), {}, "function f(f){if(f){x();throw e}y()}for(;;){if(b){x();break}y()}function g(f){if(!f)y()}function h(f){if(f)x()}for(;;){if(b){x();continue}y()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-478"), {}, "function g(){f(1,2)}function n(){f(\"s1\",!0,null.x,\"number\",3)}function s(){var a=[\"a long string\"];f(a[0],a[0],a[0])}function t(){f(a[0]);let a=[1]}function v(){var a=[1];return function(){return a[0]}}"],
			// Each array stays: a write, a delete, a call, an unknown or missing index, an element not a constant.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-479"), {}, "function z(){let n=[1,2];f(n[0]),f(delete n[0])}function z2(){let n=[1,2];f(n[0]),({x:n[1]}={})}function z3(){let n=[1,2];for(n[0]of b);}function z4(){let n=[1,2];f(n?.[0],n[1])}function z5(){let n=[1,2];f(n[0],n[2])}function z6(){let n=[1,2];f(n[0],n[0])}function z7(){let n=[1,2];f(n[0],n[.5])}function z8(){let n=[1,2];f(n[0],n[1]`x`)}function z9(){let n=[1,2];f(n[0],new n[1])}function y2(){let n=[1,2];f(n[0]),[n[1]]=b}function y3(){let n=[1,2];f(n[0]),n[1]++}function y5(){let n=[1,2];f(n[0],n[1]())}function y6(){let n=[1,x];f(n[0],n[1])}function y7(){let n=[1,-1];f(n[0],n[1])}function y8(){let n=[];f(n[0],n[1])}function y9(){let n=[1,,2];f(n[0],n[1])}function w1(){let n=[1,2];f(n[-1],n[0])}function w2(){let n=[1,2];f(n[0],n.length)}function w4(){let n=[1,2];f(n[0],n[i])}function w5(){let n=[1,2];f(n[0]),n[0]=1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-480"), { format: { comments: "all" } }, "function w3(){let a=[1,/*c*/2];f(a[0],a[1])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-481"), {}, "function g(){x=1,f({[2]:1})}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-482"), { format: { comments: "all" } }, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-482")],
			// An exit ending its function's, loop's or label's body goes, but in a `finally`, of an outer loop or before more.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-483"), {}, "for(x of y)b();function f(){x||y}function g(){try{a()}catch(n){b()}}function h(){try{a()}finally{return}}function i(){n:a()}for(;;)a();n:for(;;)for(;;){a();continue n}function j(){a?b():c()}function k(){a()}function m(){}for(;;)a();for(;;){a();break}function n(){for(;;){a();return}}function*o(){a()}"],
			// An empty `try` runs no `catch`, its `finally` printing in its place; a loop test known goes, true or false.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-484"), {}, "a();foo(),x();b();bar();var v;function f(){g();if(a)b();c()}if(x)try{}finally{y()}{let r=f();g(r,r)}for(;;)foo();for(var i=0;;i++)k();for(;0;)var w=0;"],
			// A `let` or `const` printing only its one value scopes no name: its braces go; two values or a name read keep them.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-485"), {}, "function f(){foo();for(;;)y}function g(){if(x)f();else g();while(x)z()}function h(){if(x)f();else h();if(x)f();else h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-486"), {}, "function f(){if(x){f();g()}else h();for(;;){let e=f();g(e,e)}}"],
			// What runs nothing before a name called or an unread `typeof` reads goes, and before a member is `0`, but before `eval` or in `with`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-487"), {}, "foo(),foo``,foo?.(),(0,a.b)(),(0,a.b)(),(0,a.b)(),(0,eval)(),foo,(x(),foo)``,foo``,(x(),a.b)();"],
			// esbuild's `-(a,b)` as `a,-b`, and `yield` or `await` alike, where a sequence stands bare, but where its first value would open the statement as a block.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-488"), {}, "a(),-b,a(),b,~c,a(),+1,a(),- -b,x=-(a(),b),-({[f()]:0},g());async function h(){c(),await d,c(),await(d+e)}function*k(){c(),yield d,c(),yield*d}"],
			// terser's `(a=x(),a)` as `a=x()` for a declared name no `with` reaches.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-489"), {}, "function f(n,u){return(n=x())?n++:u(),c(),n=x()}function g(a){with(o)return a=x(),a}function h(){return u=x(),u}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-490"), {}, "x=function f(){return f=1,f};"],
			// A fold keeping an infinity prints it as a division, which a member read parenthesizes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-491"), {}, "x=(1/0).toString(),y=(1/0).b;"],
			// Alone, it takes only the parentheses an assignment takes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-492"), {}, "function f(a){g(a=x());return(a=y()).b+(a=z())}"],
			// `typeof` reads a declared name or a member bare alike, but an undeclared name throws read as a value.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-493"), {}, "function f(o){return[typeof o,typeof o.x,typeof(0,u),typeof(g(),o)]}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-494"), {}, "function f(){return typeof(0,u)}function g(){return typeof(0,o)}"],
			// What follows a `try` whose block and `catch` both leave never runs.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-495"), {}, "function f(){try{return g()}catch{return h()}}function k(){try{return g()}finally{h()}}function m(){try{return g()}catch{h()}i()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-496"), {}, "with(o)(0,foo)();"],
			// A known test or left side folding to a reference a call, tag, `typeof` or `delete` reads keeps it a value with `0,`; a name called bare or `new` needs none.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-497"), {}, "(0,x.y)(),(0,x[y])``,f(typeof(0,x),delete(0,x.y)),(0,x?.y)(),(0,eval)(s),x(),new x.y,(c?x.y:2)(),(0,x.y)();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-498"), {}, "x=[(0,f.g)(),(0,f.g)``,typeof(0,f),delete(0,f.g),g(),(0,eval)(1),new(a?f:f)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-499"), {}, "for(;!x;){function f(){}}for(;y;){function g(){}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-500"), {}, "foo();for(bar();i<1;)g();x=a in b;for(;i<1;)g();x=1;for(y=1;i<1;)g();for(z=function(){a in b};i<1;)g();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-501"), {}, "function f(){var e=g(),r,t=0;for(;t<1;++t)r=k(r);return e+r+e}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-502"), {}, "t?`${a()}${b()}`:c(),u?`${a()}`:c(),t||`${a()}${b()}`,u||`${a()}`;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-503"), {}, "Object.create({},null),Object.create({},\"ab\"),Object.create({},1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-504"), {}, "(class{#s;static{#s in 1}});(class{#c;static{#c in o}});"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-505"), { compress: false, mangle: false }, "(0,foo)``;"],
			// terser's `comparisons`: `!(a==b)` is `a!=b` where an equality takes no parentheses, and a boolean compared with one is itself or negated.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-506"), {}, "x=a!=b;if(a==b)f();x=!(a<b),x=!(a==b)+1,f(a===b,[a!=b],-!(a==b)),x=a!=b&&c,x=a==b?2:1,x=c?a!=b:d!==e,x=()=>a!=b,x={k:a!=b},x=`${a!=b}`;throw a!=b;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-507"), {}, "a==b;var v=a!=b;function g(){return a!==b}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-508"), {}, "x=a instanceof b,x=!!a,x=a in b,x=y===!0,x=!(a<b),x=!delete y;while(x)f();x=!y(),x=!(a<b);if(a??!0)b();x=a&&!0;if(a&&b())c();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-509"), { mangle: false, format: { comments: "all" } }, "x=!(/*c*/a==b);if(a&&/*k*/1)b();"],
			// A name both branches call is called bare, after the test runs; `eval` or a member as `(0,f)`; in `with` the test stays, and `new` keeps it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-510"), {}, "var c;foo(\"x\"),(c(),foo)(\"y\"),(0,eval)(\"z\"),(0,o.f)(\"w\"),foo`t`,(c(),foo)`v`,new(c?F:F),(c?a:b)`u`;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-511"), {}, "with(o)(c,foo)();"],
			// terser's `loops`: `if(x)break` opening a loop's body joins its test as `!x`, but where the body scopes a name.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-512"), {}, "for(;!x;);for(;x;);for(;a&&!x;)y();while(x&&!y)z();while(a!=b)c();for(;(a||b)&&!(c&&d););for(;;){if(x)break;y()}for(;;)if(!x)y();for(;(a=b)&&!x;);for(;a&&b&&c;);for(var x=1;;){if(r)break;let r=g();h(r,r)}for(;!x;)y();for(;!x;)y();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-513"), { mangle: false, format: { comments: "all" } }, fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-513")],
			// `!!b` is `b` where `b` is a boolean; a key an integer spells is that number; a static block running nothing goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-514"), {}, "a=delete b,a=b==c,a=(b==c)+1,a=!(b<c);if(!(b<c))d();a=!b;(function(){g()})()==x;(function(){g()})()==x;x[0],x[-123],x[\"-0\"],x[\"01\"],x?.[5];class P{foo}class Q{}class R{static{g()}}"],
			// What is never nullish leaves `??` nothing to run; same logical operators regroup; an integer compared with `0` read for its truth is itself.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-515"), {}, "x(0n),x(/./),x({}),x(()=>{}),x(+y),x(y<z),x(a??b),x=a&&b&&c&&d&&e,x=a||b||c||d||e,x=a??b??c??d??e,x=a&&(b||c);if(a|+b||a&+b||!(a^+b))throw 0;if(!~a)f();x=(a|b)!==0;if(a>>b!==0)g();if(a>>b===0)g();x=(a|b)!==0?1:2,x=(a|b)!==0;if(a+b!==0)h();if(a!==0)k();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-516"), { mangle: false, format: { comments: "all" } }, "x=a&&(/*c*/b&&c),x=(a|b/*d*/)!==0?1:2;"],
			// An optional `?.` continues a chain unbroken; arithmetic beside a number converts as `+` does; `void 0` and booleans compared loosely; `yield` of nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-517"), {}, "a?.b?.c,(a?.b).c,a?.b?.(),a?.b?.[0],(a?.b)(),v=1-foo,v=foo-1,v=1e3*d,v=5|b,v=xs-6,v=a-+b,v=1+ +b,v=1-+-b,v=1-(a+b),v=(+a)**2,v=1-x++,v=null!=foo,v=null==foo,v=1==y,v=0!=y;function*g(){yield,yield*void 0,x=yield,yield void f()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-518"), { mangle: false, format: { comments: "all" } }, "v=1-/*c*/+foo,v=/*d*/void 0!=foo;function*g(){/*e*/yield void 0}"],
			// A `debugger` dropped prints nothing as a body; `if(t);else x` is `if(!t)x`; `void` of a value nobody reads goes; `use strict` in strict code goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-519"), {}, "foo();if(!x)foo();for(;;);if(!x)foo();if(!x)foo(),bar();if(a!=b)c();if(p){if(!x)foo()}else q();if(!x)if(y)z();x,f(),x=(g(),1);function q(){h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-520"), { mangle: false }, "function a(){\"use strict\";return function(){c()}}function e(){\"use strict\";\"use asm\";f()}class K{m(){g()}}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-521"), { module: true, compress: {}, mangle: {} }, "export function foo(){g()}"],
			// What nobody reads: an operator running only its operand goes, a branch running nothing goes, an array or object prints what its parts run, `x==null&&y` is `x??y`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-522"), {}, "x.y,x?.y,x.y,x.y.z(),delete x.y,delete x,x,g(),a==b,f(),a<b,g(),a=b;({}).a+1;foo(),foo()||bar(),foo()&&bar(),a,b||c(),(a??b)||c(),x=foo()?1:2,c||(a=b),c||(d,e),c&&d;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-523"), {}, "a,foo(),[...c,a],foo(),foo(),{[bar()]:foo()},g(),h(),x=[a(),b()],g(),{get a(){},b:g()},a(),b(),b,x=(f(),1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-524"), {"ecma": 2019}, "x==null&&y;"],
			// A `concat` whose pieces would join as a substitution or an octal escape stays a call.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-525"), {"ecma": 2020}, "x=y?\"a$\".concat(\"{b}\",z):0,x=y?\"\\0\".concat(1,z):0,x=y?\"a$\".concat(\"\",\"{b}\",z):0;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-526"), {}, "({a:g()}).b;g().x;({a:g()}).b.c();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-527"), {"ecma": 2020}, "x??y,x??y,a??(a=b),x??g(),o.y??(o={},o.y=3),x===null&&y,x==null&&(y||z),z=x==null&&y,f()==null&&y,x??y,x??new Y,x??a+b;"],
			// An operand of `&&` or `||` whose truth alone is read is read for its truth too; a strict equality nobody reads runs only its sides.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-528"), {}, "v=!(a||1),v=!(a&&0);if(a||b)throw 0;x=a||!0;if(a&&(b||c))d();if(a&&x)f();x=a??!0;if(a??!!b)g();h();"],
			// esbuild's `!!(!b&&c)` as `!(b||!c)`, where shorter; a logical folding to a unary takes no parentheses under `!`, and `!!` of a boolean goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-529"), {}, "a=!(b||!c),a=!(b&&!c),a=!(!b||c),a=!(!b&&c),a=!(b||c),a=!(b&&c),a=!(b||!c.d),a=!((b,c)||!d),a=!(--b||!c),x=[!(b||!c)],x=-!(b||!c),a=!b,a=!!b,a=b<c,a=!!b;"],
			// No shorter, read for its truth, under one `!` or one not `!`, it stays, as does one holding a comment kept; unread, `!b&&c` is `b||c`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-530"), {}, "a=!!(b&&c),a=!!(!b&&c+d),a=!!(!b&&!c&&d),x=!!(!b&&c).y;if(!b&&c)f();b||c,a=!(!b&&c),a=- -b;"],
			// terser's `!t&&e` as `t||e` nobody reads, and `(!a||b==c)&&d` as `a&&b!=c||d` where its operands take the negation in for less; an `||` it puts right of `&&` takes parentheses.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-531"), {}, "a||b(),a&&b(),a<b||c(),(a??b)||c(),!a||b||c(),(a,b)||c(),x=!a&&b();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-532"), {}, "a&&b!==c||d(),a&&b||c(),!a&&b!==c||d(),!a&&!b||c(),a&&b!==c||(d(),e()),a&&b||c||d(),a&&(b||c()),x=(!a||b===c)&&d();"],
			// terser's `t?a=x:a=y` as `a=t?x:y`; a member wants the test pure, and another operator a declared name, as the target is read first and a getter may run.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-533"), {}, "function f(o,t,a){y=x?3:4,z=b=x?1:2,x?b=1:c=2,o.b=t?1:2,x?o.b=1:o.b=2,a+=t?1:2,x?a+=1:a+=2,t?b+=1:b+=2,t?o.b+=1:o.b+=2}"],
			// `if`s throwing alike print as one testing either.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-534"), {}, "function f(){if(x||y||z)throw 1;g()}if(a)throw c;if(b)throw d;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-535"), { format: { comments: "all" } }, "x=!!(!b&&/*c*/c),y=!!(/*k*/!b&&c);"],
			// A test `!!!t` printing `!t` swaps the branches for `t`, as `!t` does.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-536"), {}, "x=(a,b)?d:c,x=a&&b?d:c,a?g():f(),x=a?d:c;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-537"), {}, "x,x(),x,a(),b,a,b(),f(a===b,c()),g(),a(),b(),h(),x==null,b(),b;"],
			// `x["length"]` folds as `x.length` does, and `"a"[0]` to its character; an `else if` known false goes, one known true prints its branch.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-538"), {}, "use(3),use(3),use(3),use(\"a\"),use(\"a\".x),use(\"a\"),use(a?.length),delete\"ab\".length;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-539"), {}, "if(xxx)foo;if(xxx)foo;else baz;if(xxx)foo;else bar;if(x)a();else var q;"],
			// So does an `if` known as a loop's, label's or `if`'s body; one keeping nothing prints `;`, and a block holds what a dropped branch declares.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-540"), {}, "for(;;)a();while(x)b();x;for(;;)var v;a();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-541"), {}, "for(;;){var x=1;y(x);var z}for(;;){{let e=f();y(e,e)}var w}for(;;){var u}for(;;){a();var t}"],
			// A part in parentheses, after a hole, prints what it holds.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-542"), { mangle: false }, "function f(p3){b+1,g(),h(),k(),m()}"],
			// What a logical nobody reads holds is read for its truth; a conditional printing as `!t` or `!!t` takes what a unary takes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-543"), {}, "x&&y(),(x||y)&&y(),x&&y(),x&&y(),a,a,x=!!a||b,x=y&&!!a,x=(!a).b,x=a<b&&c,x=!!a+1,a+b&&c(),x=(!a)**2,x=a?1:2;"],
			// esbuild's `x?y:0` as `x&&y` where only its truth is read: a constant branch, `NaN`, `-0` and `""` among them, is its boolean; `||` under `&&` keeps parentheses.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-544"), {}, "x&&y&&f(),!x&&y&&f(),(x||y)&&f(),x&&y||f(),!x||y||f(),!x&&y||f();if(x&&y)f();a=x&&y?1:2,a=!(x&&y);if(c?b:d)f();"],
			// The value read, a branch not a constant, an object, `void 0`, `0n`, both branches constant or a branch `&&` would take in parentheses keeps `?:`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-545"), {}, "a=(x?y:0)&&z,a=x?y:0,(x?y:{})&&f(),(x?y:void 0)&&f(),(x?[]:y)&&f(),x,(x?0n:y)&&f(),(c?a||b:0)&&f(),(x?y:g())&&f();"],
			// terser's `switches`: cases ending a `switch` that run nothing go; one with none left runs its test, or goes from its list.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-546"), {}, "a();a;if(a===3)b();if(a===3)b();switch(a){case f():}a,b();switch(a){case 1:b();break;case 2:c()}if(x)y;else z();function f(a){g()}switch(a){case 1:/*! k */}"],
			// An empty case falling into `default`, or reached from it, goes where each test after it is a constant matching otherwise.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-547"), {}, "switch(x){case 0:f();break;default:g()}switch(x){default:g();case 2:h()}switch(x){case 1:default:g();case f():h()}switch(x){case 1:default:g();break;case 1:h()}switch(x){case 1:default:g();break;case y:h()}"],
			// A read in parentheses may be what they write, and with `unused` off the array stays: either keeps its reads.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-548"), { mangle: false }, "function g(){let a=[1,2];a[0]=3,f(a[0],a[1])}function h(){let a=[1,2];a[0]++,f(a[0])}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-549"), { mangle: false, compress: { toplevel: false, unused: false } }, "function g(){let a=[1,2];f(a[0],a[1])}"],
			// A case ending a `switch` that runs nothing stays where a `default` before it would take its value.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-550"), {}, "if(a!==0)b();switch(a){case 0:break;default:b();case 1:}if(a!==1)b();"],
			// What runs nothing before a callee goes but one `0`, which a bare `eval` keeps to read no scope; a function or class takes no `this`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-551"), {}, "(0,eval)(),f(),(0,eval)();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-552"), { mangle: false }, "function g(a){(function(){h(this)})(),x=function(){}(),new function(){}(1),new class{}}"],
			// A `try` whose exit went runs nothing for its `catch`, its `finally` the tail.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-553"), { mangle: false }, "function f(){}function g(){h()}function k(){try{}catch(e){}finally{return}}for(;;){g()}"],
			// A test known falsy, `undefined` too, runs nothing for a loop or `if`, labeled or not, that declares nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-554"), { mangle: false }, "if(void 0)var q;function k(undefined){if(undefined)g()}"],
			// A known test leaves a name called bare but `eval`, and `new` takes a name or member bare.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-555"), { mangle: false }, "var a;a(),a``,new a,x=new a.b(1),x=new(a()),(0,eval)(\"x\");"],
			// A `finally` running nothing goes beside a `catch`; without one, the `try` runs as its block.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-556"), { mangle: false, format: { comments: "all" } }, "try{f()}catch(e){g()}try{f()}catch(e){}finally{/*c*/}a();f(),b();if(x){y()}else z();function k(){return g()}"],
			// terser's `loops` with an `else`: `if(x)break;else y` loops while `!x`, `if(x)y;else break` while `x`, `y` where the `if` was.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-557"), { mangle: false }, "for(;!x;)y();for(;a&&!x;)y(),z();for(;!x;)y();for(;a&&(x||w);)y(),q();for(;(a||b)&&(c,d);)y();for(;x;){let q=g();y(q,q)}if(a){for(;!x;)if(y)z()}else w();"],
			// The branch kept joins the statements after it, the loop's braces going for one; an object opening it or a block kept stays apart.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-558"), {}, "for(;!x;)y(),z();for(;x;)y(),z();while(!x)y();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-559"), { format: { comments: "all" } }, "for(;!x;){({}).a=1;z()}for(;!x;){y(),q();z()}for(;;){if(x)break;else/*k*/y();z()}"],
			// A block ending a loop an `if` with an `else` holds keeps its braces where it ends in an `if` the `else` would take.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-560"), {}, "if(q)for(;;){if(y)z()}else w();if(q)for(;!x;){if(y)z()}else w();if(q)while(a){if(y)z()}else w();if(q)while(a)y?z():v();else w();"],
			// A function an `else` declares keeps its braces, and a label's comment its loop.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-561"), { mangle: false }, "for(;a&&!x;){function f(){}}for(;a&&!x;){y(),z()}/*! c */l:while(0)f();"],
			// Nobody reading it, or only its truth, `x!=null&&x.y()` is `x?.y()`, but not where `with` may read the name twice otherwise.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-562"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a,b){a?.b(),a?.b(),a?.[0](),a?.();if(a?.b)f();x=a!=null&&a.b,a!=null&&a.b``,a!=null&&(a.b=1),a!==null&&a.b(),b!=null&&a.b(),a!=null&&a?.b(),a!=null&&a.b?.c,a!=null&&ab.c}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-563"), { ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "with(o)a!=null&&a.b();"],
			// `??` takes a sequence or conditional parenthesized as `&&` and `||` do.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-564"), { ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "a.y??(a={},a.y=3),a.y??(b(),a.y=3),a.q??(b?c():d());"],
			// An array or object an unread one holds prints only what it runs too.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-565"), {}, "f(),f(),g(),h(),x=[[f()]],f(),g();"],
			// A call marked pure that nobody reads runs only its arguments, but not a spread or under a value read.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-566"), {}, "g(),g(),h(),g(),f({a:g()}.b),x=(g(),h(),1),x=void f(g(),h()),g(),h(),k(),[...g()],f(g())?.(h());"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-567"), {}, "g(),h(),g(),h(),f(function(){g()}());"],
			// A branch beside the `break` running nothing leaves no statement, the loop running while the test is true.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-568"), { mangle: false }, "while(a&&b&&delete x.a)f();while(a&&c)f();for(;;){if(c){/*! k */}else break;f()}while(a&&c){var q;f()}for(;x;);"],
			// A logical assignment every branch ends in hoists past a pure test, as a compound one does.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-569"), { mangle: false }, "var a=foo,x=bar;a||=x?1:2,f()?a||=1:a||=2,x?a||=1:a&&=2,a+=x?1:2;"],
			// `x?x:y` is `x||y` for a global too, but not where `with` may answer it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-570"), {}, "x||y;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-571"), {}, "x?x:y;with(o)x?x:y;"],
			// Nobody reading a boolean compared, its `!` goes; an integer equal to `0` is `!` of it wherever read, but not where parentheses would hold the `!`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-572"), {}, "a instanceof b,delete x,x=!(a instanceof b);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-573"), {}, "f(!(a&2)),f(!(a&4)),f(!!(a&4)),a&2,g(),x=2+((a&2)==0),x=[!(a^2)];"],
			// A `return` of what is `undefined` anyway ending a function prints what it runs, but not nested, after an `if` or as an arrow's body.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-574"), { mangle: false }, "function f(){foo()}function g(){b,a}function h(){if(x)return void g();k()}function i(){g()}function j(){({a:g()}.a)}function k(){return x?void g():void h()}function l(){g()}f=()=>void g(),f=()=>(h(),void g());class C{m(){g()}}"],
			// A test or branch `?:` parenthesized keeps its parentheses as an operand of `&&` or `||`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-575"), {}, "x=!f&&(g(),!0),x=!f||(g(),v),x=!(f=a===b)&&v,x=!(f=a===b)||v,x=!(f?l:r)&&v,x=!(a,b)&&(c,d);"],
			// `x!=null?x:y` is `x??y` where `y` stands bare after `??`, and `x!=null?x.y:void 0` is `x?.y`, wherever read.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-576"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a){x=a??b,x=a??b,x=a?.b.c[d](e),x=a?.(),x=a!=null?a:b||c,x=a??(b,c),x=(a??b)||c,x=a!=null?a.b:c,x=a!=null?b.c:void 0}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-577"), { ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "with(o)x=a!=null?a:b;"],
			// So does a test printing as `x!=null`, from strict comparisons either way round; two names, one value twice or swapped branches stay.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-578"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a){x=a??b,x=a??b,x=a?.b,x=a==null}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-579"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a,c){x=a===null||c===void 0?b:a,x=a!=null?b:a,x=a===null||a===null}"],
			// esbuild's `a?c:(b,c)` as `(a||b),c`, `a?(b,c):c` as `(a&&b),c` and `a?b||c:c` as `a&&b||c`, where shorter with the parentheses it adds.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-580"), {}, "a||b,c,a&&b,c,a&&b||c,x=a?y=1:c,x=a&&b&&d||c,f((a||b,c)),x=(a||b,c).y,a||f(),c,(a||b,c)``,x=((a,b)||d,c),(a??b)||d,c;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-581"), {}, "x=a?b||d||c:c,x=(a||f(),c),x=a?c:(b,d),x=a?c:(b,e,c),x=a?b||c:c+1,x=a?b||c:d,x=a?c:c;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-582"), { format: { comments: "all" } }, "x=a?c:(b,/*k*/c);"],
			// terser's `a?b?c:d:d` as `a&&b?c:d` and `a?b:c?b:d` as `a||c?b:d`, but not where the inner `?:` swapped its branches.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-583"), {}, "x=a&&b?c:d,x=a||c?b:d,x=a?b?d:c:c,x=(a=1,b||e?c:d),x=(a||f)&&b?c:d,x=a||c||e?b:d,x=a?b?c:d:e;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-584"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function k(a){x=a!=b?a:c,x=a??b+c,x=a??new B}x=(a,b)&&(c,d)?e:f;"],
			// terser's `t?f(a,x):f(b,x)` as `f(t?a:b,x)`, a local `f`, a pure test and one argument apart.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-585"), { mangle: false }, "function f(a,b){x=b(a?c:e,d),x=b(a===0?c:e),x=a?b(...c):b(...e),x=a()?b(1):b(2),x=a?b(1,2):b(3,4),a?b(g(),1):b(g(),2),x=b(a?c=1:e),x=b(a?(c,d):e)}x=a?f(1):f(2);"],
			// terser's `unused` of a write whose value is read: nobody reading the name, it prints as the value, but not where the name is read, in its dead zone, through `arguments` or in dead code.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-586"), { mangle: false }, "function f(){return 1}function g(b){return c(),b}function h(){x(1);if(k())l()}function i(){x(k())}function j(){var a;return x(a=k()),a}function k(){x(a=g());let a}function l(a){return x(a=g()),arguments}function m(c){for(;c;)c()}function n(a){var m=1;return m}function o(){p(),q()}"],
			// A `for` start running nothing goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-587"), {}, "for(;c;)f();for(a.b;c;)f();for(/*! c */0;;);"],
			// A function called whose value, `return` or directive runs nothing runs nothing; what follows the `return` never runs.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-588"), {}, "x=2,g(),x=(f(),1);"],
			// A call `pure_funcs` names keeps what its arguments run in it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-589"), { compress: { pure_funcs: ["debug"] } }, "debug(g()),g();"],
			// Nobody reading `&&`, `||` or `??`, a right side running nothing goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-590"), {}, "a,a,a,f(),g(),x=a||0,a,b,a()||b,function(){}.call();"],
			// A `break` before cases running nothing does nothing, a test matched skipping the rest.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-591"), {}, "switch(foo){case\"bar\":bar();case\"moo\":case moo:}switch(a){case 1:b();break;case 2:c()}switch(a){case 1:b();default:case g():}switch(a){case 1:b();break;/*! c */case g():}"],
			// terser's `switches` of one case and a `default`: `if…else` after a `break`, the other after where one falls into it, in a list, its block keeping braces.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-592"), {}, "if(a===1)b();else c();if(a===1)b();c();if(a===1)b();else c();if(a!==1)c();b();if(a!==1)b();if(a!==1)b();if(a===1)b();else if(y)z();w();if(a===1){if(y)z()}else w();if(a===1){{let a=g();f(a,a)}}else h();switch(a){case 1:f();if(x)break;g();break;default:h()}for(;;)switch(a){case 1:f();break;default:g()}if(x){if(a===1)f();g()}else h();switch(a){/*! c */case 1:b();break;default:c()}if(b()===1)c();else d();if(a===f())c();else d();"],
			// terser's `loops`: `do` forever is `for(;;)`, and a body running once with nothing leaving it early runs where the loop was, but not labeled.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-593"), {}, "for(;;)c();d(),e();f();do{if(x)break;d()}while(0);{let e=g();h(e,e)}do{d()}while(0);if(a){d(),e()}else f();do{if(a===1)b()}while(0);!function(){for(k in o)break}();"],
			// terser's `dead_code` of a loop whose body is a `break`: what sets it up and its test run once, and one running nothing goes from its list.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-594"), {}, "a();b();c(),d();f();h();j(),k();x();x();if(a)x();else y();for(var i=0;x;)break;x();a in b,c;"],
			// terser's `evaluate`: `!` of an object made running nothing is `!1`, `delete` of what is no reference `!0` and of the global `undefined` or `NaN` `!1`, but a write in it stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-595"), { compress: { toplevel: true } }, "x=!1,x=!1,x=!0,x=!0,x=!1,x=![f()],x=!0,x=!0,x=!1,x=!1,x=(0,a,!0),x=!0,x=delete a.b,x=delete a,x=delete a?.b,x=delete f();g();x=!0;"],
			// A function called prints as what it returns past parameters passed nothing nothing reads, but not one it returns or where `arguments` reads them.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-596"), {}, "console.log(123),console.log(function(n,o,t){return t}()),console.log(function(n){return 6}(a));function q(n){console.log(n)}console.log(function(n){return arguments.length}());"],
			// A logical expression a known left side folds to a name called prints the name, and `eval`, a member or one `typeof` reads after `0,`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-597"), {}, "x=y,f(),(0,x.y)(),f(),(0,x.y)``,(0,eval)(\"x\"),q,g``;"],
			// esbuild's `??` of a function, class or object is it, parenthesized at a statement's start, and of `void 0` its right side, of `void` of a call that call, then the right side.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-598"), {}, "x(class{}),x(function(){}),x(1),(0,a.b)(),x={}.y,x=a+1,y=(a,b);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-599"), {}, "x({}),x((f(),1));({}).x;"],
			// A function running nothing called runs only its arguments where nobody reads the call.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-600"), {}, "a(),b(),c(),x=void a();"],
			// A logical folding to an assignment keeps the parentheses that needs under the same operator.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-601"), {}, "a&&(x=1);const T=1;b&&(y=1);"],
			// A BigInt zero is falsy but strictly unequal to `0`: only `==` and `!=` fold an integer's comparison with it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-602"), {}, "if((a|b)!==0)f();if(a|b)g();x=(a&b)===0,x=!(a&b);"],
			// `eval?.()` is an indirect `eval`, which reads no local name: a guarded direct one stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-603"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function f(eval){var v=42;return eval!=null&&eval(`v=43`),x=eval!=null?eval(`v`):void 0,v}"],
			// A name a value collapsed into prints that value, which `!` parenthesizes; an update or `await` joins `&&` bare.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-604"), { mangle: false }, "function f(o){for(var h=!1,i=0;i<9&&!(h=o[i]===!0);i++);return h}function g(o){if(!(o.a===1))k()}for(;i--&&!x;)y();x=i--?2:1;"],
			// An inlined body's statement prints as an operand, so its sequence keeps its parentheses; a function moved into `Object(f)` keeps the call.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-605"), {}, "x||(a(),b)+c;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-606"), {}, "Object(function(){g()})(1);"],
			// An assignment collapsed into the test of an `if` printing as `?:` is that test, in parentheses.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-607"), {}, "(x=y+c)?y+c:d();function f(){return(x=y+c)?a:b}"],
			// A call printing as `null` or a regular expression needs no parentheses read off; a value folded into its read prints where that is; an `else if` known later leaves its `if` nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-608"), { mangle: false }, "function r(){return null}function q(){return/a/}x=r().filepath,y=q().source;function f(a){return{a:a,b:g(a)}}f(()=>{g()});"],
			// What prints first in a statement again parenthesizes an object, function or class alone, so one inside a part or argument keeps its literal or call; a `+` before one stays; a `do` running nothing once prints nothing in a list.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-609"), {}, "({1:{toString(){}}/2});f({a:g()}.b),x=+{}/2,+function(){}/3;a();b();if(x){}else c();g();"],
			// A strict comparison with `0` folds only where no BigInt reaches it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-610"), {}, "if(a>>>b)f();if(!((a|1)&b))g();if((a&b)===0)h();"],
			// `if(t)if(u)x` is `if(t&&u)x` where neither test needs parentheses there, as what a test prints as decides.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-611"), {}, "if(a&&b)c();if(a&&b&&c)d();if(p){if(a&&b)c()}else z();if(a=1)b=2,c();if(a)b?c():d();function f(){if(!x&&a&&b)c()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-612"), {}, "function f(){if(a||b)if(c)d()}function g(){if(c)if(a||b)d()}function h(){if(!y&&(a||b))d()}function k(){while((a||b)&&!x)g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-613"), {}, "if(c)if(a||b)d();if(c&&a)d();if(c)if(a||b)d();if(c&&a)d();"],
			// A comparison printed as `!x` takes a `!` bare.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-614"), {}, "x=!!(e&6),x=!(e&6),x=-((e&6)==0);function f(){return!!(e&6)||g()}"],
			// terser's `if_return`: `if(t)return;x;y` is `if(!t){x;y}`, unbraced where they print as one statement, and kept where a block would scope what they declare.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-615"), {}, "while(x)if(!y)z(),w();function f(){if(!x){a();if(!y)b(),c()}}function n(){if(!x)for(a();;)b()}function m(){if(x)return;a();class n{}b(n)}function p(){if(!x)a(),b()}"],
			// A loop's body printing as one statement drops its braces, its last statement owing the `;` the brace took.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-616"), {}, "while(x)if(!y)z(),w();for(g();;)if(!y){z();if(!q)w(),v()}for(g();;)if(!y)z(),a={};g();if(a)for(;;){if(!y)z(),w()}else q();for(;;);"],
			// A `do` body ending in a `break` runs once where the loop was, its test never.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-617"), {}, "foo();foo();if(a){f(),g()}else h();for(;;);{let e=f(),o=g();h(e,o,e,o)}a={};for(;;);do{if(a)break;f();break}while(x);"],
			// A `try` every path of which leaves, or an `if` both branches of which do, leaves its `else` to print after it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-618"), {}, "function f(){if(a)try{return g()}catch{return g()}throw i()}function k(){if(a)try{b}finally{return g()}throw i()}function m(){if(a)try{return b}catch{c}else throw i()}function n(){if(a){if(b)return 1;throw 2}g();h()}function p(){if(a)try{return 1}finally{c()}g();h()}"],
			// A call printing as the unary its function returns is parenthesized as that unary.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-619"), {}, "x=(-a)**2,x=(!a).b,x=(!a)(),x=`${!a}`,x=(void a)``;function q(){}"],
			// A statement printing its body in place, or a `switch` as an `if` and what falls through, is several statements: braces hold them.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-620"), {}, "if(a){for(;;)g();f()}if(a){for(;;)g();f()}if(a){for(;;)g();f()}for(;;){for(;;)g();f()}if(a){for(;;)g();f()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-621"), {}, "function f(){if(!x){for(;;)g();a()}}function k(){if(!x){if(d===1)a();b()}}function m(){for(;;)if(!x){g();if(d===1)a();b()}}function n(){if(!x){for(;;)g();a()}}i:for(let i=0;i<1;i++){if(i===0)continue;break i}for(;;)if(!x)break;"],
			// terser's `dead_code`: a `var` past an exit declares its names and sets none, so no read folds its value; a pattern keeps it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-622"), {}, "function f(){return use(()=>n),1;var n}function k(){g()}function m(){return function(){return n};var n}function p(){return;var[n,r]=g()}function q(){if(!x)do{}while(y)}"],
			// A test the guard would negate in parentheses keeps its exit, which compresses better.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-623"), {}, "function f(){if(a&&b)return;c(),d()}function g(){if(a!==b)c(),d()}function h(){if(a<b)return;c(),d()}"],
			// terser's `join_vars`: a later `var` declaring names only joins the first `var` printed; one with a value or a pattern stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-624"), {}, "function f(r){var a=c.get(r),n;if(a!==void 0)return a;return g(n=h()),n}function k(){var r=g(),a;h(r,a);var n,e,[f]=r,o;use(n,e,f,o)}"],
			// A sequence setting the declared names in their order gives them their values; one set before an earlier name stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-625"), {}, "function f(){var a=g(),c,n=h();k();return[a,c,n]}function h2(){var a,c=g();a=h();let n;n=a;return[a,c,1,n]}"],
			// terser's `join_vars` of a statement and the loop after it: an expression or a `var` whose names the loop sets joins the head, a bare `var` taking the value the `for` sets first or the name `for`-`in` and `for`-`of` assign, and a `let` takes the value it is first set to.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-626"), {}, "function f(){for(var a=0;a<9;a++)use(a)}function h(){for(init();c<b;c++)use()}function k(){for(var a=1,n=2;;)use(a++,n)}function m(){for(var a=use();a;a=a.next)use(a)}function n(){for(var a in b)use(a)}function p(){for(var a of b)use(a)}function q(){if(x)for(var a in b)use(a)}function r(){let a=1;for(;a<9;a++)use(a)}"],
			// A `let` or `const` stays outside, as does a `var` with a value a `for`-`in` sets, one of several declarators, one a `var` before takes bare, a directive, a statement reading a name declared right before it, a `let` whose value runs code and a `var` the loop never sets, which folds or goes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-627"), {}, "function f(){let a=0;for(;a<9;a++)use(a);use(a)}function h(){var a=1;for(a in b)use(a)}function k(){var a,u;for(u in c)use(a,u)}function m(){for(var a=use(a);;a++)use(a)}function n(){x();for(y();;)use()}function p(){\"use strict\";for(;;)use()}function r(){let a;for(a=use();a<9;a++)use(a)}function u(){var a=use();x.y=a;for(;;)use()}function v(){var a=use(),u;for(u in b)use(u,a)}function w(a){for(;a;)a(2)}function z(a){for(;a;)a()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-628"), {}, "function f(){use(use());var a;for(a in c)use(a)}function g(){use(use());for(var a=0;a<9;a++)use(a)}function h(){use(use());for(use();;)use()}function k(){var[a]=use();for(;;a++)use(a)}"],
			// A global no rule drops joins whether the loop sets it or not, but not in a static block or under `toplevel`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-629"), {}, "for(var a=0;c<b;c++)use();if(x)for(var d in b)use();class C{static{for(;c<b;c++)use()}}use(C);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-630"), { compress: { toplevel: true } }, "for(;c<b;c++)use();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-631"), { format: { comments: "all" } }, "function f(){var a=0;/* c */for(;a<9;a++)use(a)}function h(){for(var a=0;a<9;a++)use(a)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-632"), {}, "function f(){for(var n=(\"x\"in o);;n++)use(n)}function h(){a=\"x\"in o;for(;;)use()}"],
			// A `var` whose declarators print their values apart is several statements: a loop keeps its braces, and no bare `var` joins it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-633"), {}, "function f(){for(let i=0;i<3;i++)g(i)}function k(){f();use(2);var i;use(i=1,i)}"],
			// terser's `a|(b|c)` as `a|b|c`, for `|`, `&` and `^` alone.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-634"), {}, "x=a|b|c,x=a&b&c,x=a^b^c,x=a|b&c,x=a&(b|c),x=a-(b-c),x=a|b|c|d;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-635"), { format: { comments: "all" } }, "x=a|(/*k*/b|c);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-636"), { format: { comments: "all" } }, "function f(x){h(x+=(/*k*/a-b))}"],
			// An operand opening with a group of its own keeps it: only parentheses wrapping it whole go.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-637"), {}, "function f(x){k(x|=(g(),h())|f(c))}"],
			// A call of a function moved to it that runs nothing prints its arguments, or nothing as a statement no `?:` prints.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-638"), {}, "x=()=>{},y=()=>{g()};function f(){a?[]:b()}function k(){h(function(){}(g()))}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-639"), {}, "function m(){f(),[h(),...a],k()}"],
			// A write nobody reads prints a called reference after `0,`, and keeps one `typeof` reads; a `do` ending in an open `if` keeps its loop before an `else`; a negated name prints what it holds bare.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-640"), {}, "function f(){(0,o.m)()}function g(){(0,eval)(\"1\")}function h(){var n;return typeof(n=y)}function k(){m(n())}if(a)do{if(b)x()}while(0);else y();function p(n,f){if(f&&q(n))r(),s()}"],
			// An async generator awaits what it returns, so `return void 0` ending one keeps its `return`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-641"), {}, "async function*g(){return void 0}async function*h(){return x(),void 0}function k(){x()}"],
			// `!` negates an optional chain whole.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-642"), {}, "function f(){if(!t?.has(x))y()}for(;;)if(!t?.has(x))y();x=!t?.a&&y;"],
			// A built-in called on primitives prints its answer where that is no longer, and folds what reads it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-643"), {}, "x=[12,!0,2,\"A\",\"ab\",\"c\",\"ABC\"];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-644"), {}, "x=[-1,(-1).x,-3,(-1)()];"],
			// One newer than `builtinsEcma` folds only once it reaches the built-in's edition.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-645"), {}, "x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-645"), { compress: { toplevel: false, builtinsEcma: 2020 } }, "x=[\" ab\",-1,\"xx\"];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-646"), {}, "x=[\"ab\",\"ab\",`${a}`.toString()];"],
			// ECMAScript 5 reads no binary or octal string, which the build's engine would.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-647"), { compress: { toplevel: false, builtinsEcma: 5 } }, "x=[Number(\"0b1\"),Math.abs(\" 0O7\"),1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-648"), { compress: { toplevel: false, builtinsEcma: 2015 } }, "x=[1,7];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-649"), { compress: { toplevel: false, builtinsEcma: 5 } }, "x=[Number(+\"0b1\"),-\"0o7\",\"0b1\"*1,!0,\"string\",!1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-650"), { compress: { toplevel: false, builtinsEcma: 2015 } }, "x=[1,-7,1];"],
			// Not given, it is the compressor's `ecma`: an engine running that syntax has the built-ins too.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-645"), { compress: { toplevel: false, ecma: 2015 } }, "x=[\"ab\".padStart(3),-1,\"xx\"];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-645"), { compress: { toplevel: false, ecma: 2020, builtinsEcma: 5 } }, "x=[\"ab\".padStart(3),Math.sign(-2),\"x\".repeat(2)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-651"), { compress: { toplevel: false, builtinsEcma: 2020 } }, "x=[\"a\".repeat(99),1..toPrecision(22),\"1.5\",1..toFixed(20)];"],
			// It stays a call where an engine may answer otherwise, throws, answers no finite primitive or `NaN`, or runs code.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-652"), {}, "x=[\"\u00c4\".toLowerCase(),decodeURI(\"%\"),Math.max(),\"a\".repeat(99),\"ab\".concat(g()),1.5.toString(2),1..toFixed(30),parseInt(\"\u180e1\"),3,\"1.0\"];"],
			// `NaN` prints as the global's name, but where `with`, `eval` or a binding may take it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-653"), {}, "x=[NaN,NaN,NaN,NaN,NaN];"],
			// `Array.of` is the array literal of what it is passed, but where a write replaces it, a binding takes the name or a chain may skip it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-654"), {}, "x=[[\"a\",\"b\"],[],[...a,1],Array?.of(1)];function f(r){return r.of(1)}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-655"), {}, "Array.of=f,x=Array.of(1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-656"), {}, "x=[[1,2],[0,1,2,3]];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-657"), {}, "with(o)x=0/0;function f(a){return 0/0}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-658"), { compress: { toplevel: false } }, "var NaN;x=0/0;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-659"), {}, "x=0/0,eval(\"\");"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-660"), {}, "function f(a,t){x=[a.abs(-1),t(\"1\")]}x=[Math?.abs(-1),Math.abs?.(-1),Math.abs(g),Math.abs(/*! c */1)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-661"), { compress: { toplevel: false }, mangle: false, keep_fnames: true }, "x=[1,1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-662"), {}, "x=hasOwnProperty.call(a,b)+constructor.name(1);"],
			// A call measured by what it holds folds where an argument worked out prints no shorter than its answer, and stays where that prints longer.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-663"), {}, "x=[-.6666666666666667,Math.sqrt(.5),2..x];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-664"), {}, "x=[2,\"abc\",\"a1\".concat(\"b\"),2.5.x,(-1)()];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-665"), {}, "x=[3,\"-Infinity\",\"\\0\",!1,2];"],
			// A built-in the program may replace, set, passed or stored anywhere, stays a call; a parse past 20 digits or in another radix too.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-666"), {}, "Math.abs=f,String.prototype.concat=g,globalThis.parseFloat=h,Math[1]=k,x=[Math.abs(-1),\"a\".concat(\"b\"),parseFloat(\"1\"),2,1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-667"), {}, "delete Number.prototype.toFixed,Math.round++,[String.prototype.trim]=[f];for(Math.ceil in o);x=[1..toFixed(1),Math.round(1.5),\" a\".trim(),Math.ceil(1.5),1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-668"), {}, "window[k]=f,x=[parseInt(\"1\"),Math.abs(-1)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-669"), {}, "var g=globalThis;g.parseInt=f,x=parseInt(\"12\");"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-670"), {}, "({abs:Math.abs}={abs:f}),[...Math.round]=[],({...Math.ceil}=o),x=[Math.abs(-1),Math.round(1.5),Math.ceil(1.5),1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-671"), {}, "window.Math=m,String.prototype=p,x=[Math.abs(-1),1,\"a\".concat(\"b\"),\"A\"];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-672"), {}, "Object.assign(Math,o);function q(a=Number){}var s=String;x=[Math.abs(-1),Number.isNaN(1),\"a\".concat(\"b\")];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-673"), {}, "Object.setPrototypeOf(Number.prototype,p),g(Math,[String],{a:Number}),Object.keys(Math),Object[k](Math),x=[1,1..toFixed(1),\"ab\"];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-674"), {}, "x=[parseInt(\"z\",36),parseInt(\"123456789012345678901234\"),parseFloat(\"1.23456789012345678901234\"),255];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-675"), {}, "function f(a){a.abs=g,h(a)}Math.prototype.abs=k,y=1,x=1;"],
			// Constructed, it parenthesizes only a sign, as a second print would.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-676"), {}, "x=[new\"abc1def\",new(-1),new 1(3),new(g(1))];"],
			// Unread, it goes however long its answer; an outer call folds on it, and another radix needs a safe integer.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-677"), {}, "x=[2,1e20.toString(36),\"z\"];"],
			// An unread built-in call that can't throw or run code goes: terser's `builtins_pure` tables, edition-gated, with converted arguments checked.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-678"), {}, "Object.isFrozen(),new Math.abs(1),new Date.now,x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-679"), {}, "Array(-1),Array(2**32),Array(a),String({toString(){return f()}}),String({valueOf:f}),String({__proto__:p}),String({[k]:1}),String({...o}),Error(\"m\",{get cause(){f()}}),Math.abs(a),x=1;"],
			// `Math.random` nothing reads is unobservable, and `NaN` and `Infinity` convert as numbers.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-680"), {}, "Math.abs(-1n),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-681"), {}, "Math.abs(Math.random()),Math.random=g,Math.random(),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-682"), {}, "function h(a,n){Math.abs(-a),Math.abs(n)}"],
			// A `concat` of an array literal joins the array literals and constants it leads with.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-683"), {}, "x=[[1,2,1,2,\"a\"],[3],[1].concat(y),[1].concat(...y),[],[1,2].length,\"1-2-3\"],[1,2];"],
			// A hole reads the prototypes, an argument may be an array, and a comment stays in place; `["concat"]` joins as `.concat` does.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-684"), {}, "x=[[1,,2].concat(3),[1].concat([,2]),[1].concat([...a]),[...a].concat(1),[f()].concat(g(),[h()]),[1].concat(y).concat(2),[1].concat(/*! c */2),[1].concat(2),[1].concat?.(2),[1,2],[1].concat(y).join()];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-685"), {}, "x=[[g(),1].join(),[1,g()].join(),[1].concat((g(),2)).join(),\"1,,\"];"],
			// A spread of a literal after what joins prints its items.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-686"), {}, "x=[[1].concat(y,2,3),[1].concat(y,z),[1].concat(2,y)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-687"), {}, "Array.prototype.concat=f,x=[1].concat(2);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-688"), {}, "Reflect.defineProperty(Array.prototype,\"concat\",d),Reflect.set(Math,\"abs\",f),x=[[1].concat(2),Math.abs(-1)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-689"), {}, "Reflect.get(Math,\"max\"),x=[[1,2],2];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-690"), {}, "Reflect.set(Math,\"sign\",f),Object.assign(Number,o),x=[Math.sign(1),Number.isNaN(1)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-691"), {}, "Reflect.get(Math,\"abs\"),Object[1](Math),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-692"), {}, "Reflect.deleteProperty(Array.prototype,\"concat\"),Reflect.setPrototypeOf(Math,p),x=[[1].concat(2),Math.sign(1)];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-693"), {}, "Array.prototype[Symbol.isConcatSpreadable]=!1,x=[1].concat([2]);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-694"), {}, "Object.prototype[Symbol.isConcatSpreadable]=!1,x=[1].concat([2]);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-695"), {}, "Array[Symbol.species]=g,Array.prototype.constructor=h,x=[1].concat(2);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-696"), { compress: { toplevel: false, builtinsEcma: 2020 } }, "new Map([1]),new Map(a),new WeakSet([1]),new WeakMap([[1,1]]),new Symbol,x=1;"],
			// Without `unsafe` too, a weak collection of nothing or of an empty string, a `Set` of a string's characters,
			// a length `ToIndex` reads off a primitive, a BigInt converted to a string or a number, and `ToObject` of a primitive.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-697"), { compress: { toplevel: false, builtinsEcma: 2020 } }, "new WeakSet(\"a\"),new Map(\"a\"),new ArrayBuffer(-1),new BigInt64Array([1]),isNaN(1n),BigInt(1.5),BigInt(\"x\"),BigInt({}),BigInt(),new BigInt(1),Object.keys(null),Object.create(1),x=1;"],
			// Before ECMAScript 2015 a weak collection may be missing, and `Object.keys` throws on a primitive.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-698"), { compress: { toplevel: false, builtinsEcma: 5 } }, "new WeakMap,Object.keys(1),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-699"), { compress: { toplevel: false, builtinsEcma: 2026, unsafe: true } }, "new Promise(function(){g()}),new Proxy(1,{}),new WeakRef(1),new Iterator,AggregateError(1),RegExp(\"(\"),decodeURI(\"%\"),new parseInt,Int8Array(1),Uint8Array(1),new Int8Array([1n]),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-700"), { compress: { toplevel: false, builtinsEcma: 2020, unsafe: true } }, "new WeakSet([1]),new WeakSet([,{}]),new WeakMap([[1,1]]),new WeakMap([[]]),new WeakMap([1]),new WeakMap([,]),new Map([,]),new Map(\"ab\"),JSON.stringify(1),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-701"), { compress: { toplevel: false, unsafe: true, builtinsEcma: 2026 } }, "Object.keys(null),Object.create({},{a:1}),Reflect.ownKeys(1),RegExp.escape(1),String.fromCodePoint(-1),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-702"), {}, "Math.abs=f,Math.abs(1);function g(a){a()}Array.isArray=h,Array.isArray(1),new(Array=k)(1),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-703"), { compress: { toplevel: false, unsafe: true, builtinsEcma: 2020 } }, "Object.keys=f,Object.keys({});var o=Object;o.isFrozen=g,Object.isFrozen({}),Object.assign(Date,h),Date.now(),x=1;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-704"), {}, "Math.abs?.(1),Math?.abs(1),a.Math.abs(1),Math.abs.call(1),x=1;"],
			// A call that stays one where the dropped `var` keeps it stays one where its value is read too.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-705"), {}, "!function(){var a=\"[^\\\\.]\",r=\"(W)\".replace(\"W\",a);g(RegExp(\"^\"+r+n+\"$\"),a,\"\\\\.\")}();"],
			// An array or regular expression literal converts to a number as it joins; a hole or a name stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals"), {}, "x=[0,1,-2,NaN,+[,1],+[a]];"],
			// `typeof` of an object literal or of a boolean that runs nothing, where no longer; a class stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-2"), {}, "var a,b;x=[\"object\",\"object\",\"boolean\",typeof!a,typeof class{},typeof{a:f()},typeof(a=b===1)];"],
			// `BigInt` of a BigInt literal is itself, `Boolean` of an object literal is `true`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-3"), {}, "x=[0n,BigInt(-1n),BigInt(1),!0,!!{a:f()}];"],
			// `toString` of a regular expression, a BigInt, or `NaN` and the infinities in any radix.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-4"), {}, "x=[\"/a\\\\b/gi\",\"1\",\"ff\",\"NaN\",\"Infinity\",.5.toString(3)];"],
			// A built-in the program replaces keeps its call or conversion.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-5"), {}, "RegExp.prototype.toString=f,BigInt.prototype.toString=g,x=[/a/.toString(),1n.toString(),\"\"+/b/,`${/c/}`];"],
			// A computed key that folds prints plain; a call's argument or receiver worked out folds it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-6"), {}, "x=[{foo:1,3:2,\"-1\":3,a1:4,[c]:5},\"2\",\"1\",NaN];"],
			// A regular expression in a template converts to its text.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-7"), {}, "x=`/a/ /c/ ${a?/e/:/f/}`,y=\"/g/\";"],
			// A read of an array literal picks an element of one spread in it, where the others run nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-8"), {}, "x=[a,f,[g(),2][1],[1,2,...b][0]];"],
			// A template or `+` of constants reads as its string; past a string's end, a read is `void 0` where that is shorter in bytes.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-9"), {}, "x=[1,2,\"2\",(\"ab\"+c)[0],void 0,\"a\"[1]];"],
			// `join` converts any primitive separator, joins array elements as their own and spread array literals in place.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-10"), {}, "x=[\"1null2\",\"a75\",\"1true5\",\"1,2,3,4\",\"123\",[[f()]].join(),[[1,[2]]].join()];"],
			// `parseInt` of a radix outside 2 to 36 parses nothing; another not exact stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-11"), {}, "x=[NaN,NaN,NaN,parseInt(\"1\",4294967298),parseInt(\"1\",3)];"],
			// A spread object literal's methods print in place, `__proto__()` too; one reading `super`, a getter or `__proto__:` keeps it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-12"), {}, "x=[{a:a,b(){},c:c},{[b](){}},{d:d,__proto__(){}},{...{e(){return super.x}}},{...{get f(){return 1}}},{...{__proto__:p}}];"],
			// A call to a function written in place, empty and of plain parameters, is `undefined` once its arguments ran, which a spread in an object copies nothing of.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-13"), {}, "x=[void 0,void 0,void 0,{a:a,b:b},((a={})=>{})(),(({a:a})=>{})(),(async()=>{})(),void 0,[...(()=>{})()]];"],
			// `??` of a left side known nullish or not, which runs something, prints as a sequence or its left.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-14"), {}, "x=[(y,1),(y,void z,1),(y,0),(f(),{}),y??1],a=1,f();"],
			// A conditional of an object test folds, and one folding to a string or number takes no parentheses; one keeping a name stays wrapped for `typeof`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-15"), {}, "x=[1,1,\"a\".length,(f(),1),\"a\"],y=typeof(0,a);"],
			// `t ? true : v` is `t || v` where an assignment, sequence or conditional gives a boolean; a compound assignment stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-16"), {}, "use((f=a===b)||v,(g(),a===b)||v,(f?a===b:c===d)||v,(f=a===b)&&v,(f+=a===b)?!0:v);"],
			// A computed `Infinity` key prints `[1/0]`, shorter than the name.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-17"), {}, "var{[1/0]:a}={};x={[1/0]:1,NaN:2};class A{[1/0](){}}"],
			// A method read as `["name"]` folds as one read with a dot; an array of constants converts in a template.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-18"), {}, "x=[[1],\"1\",!1,\"b\",2,[1][c](2),\"abc12,3\",\"a\".concat([b]),\"1,2\",`${[,1]}`,`${[f()]}`];"],
			// `indexOf`, `lastIndexOf` and `concat` convert a regular expression or array of constants to a string; `includes` and `startsWith` stay, as a regular expression throws there.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-19"), {}, "x=[6,6,\"ab\".includes(/b/),\"ab\".startsWith([1]),\"a1,2/x/\",\"a\".indexOf([f()])];"],
			// A `join` of constants reads as its string: indexed, measured or a method's receiver.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-20"), {}, "x=[\"11\",\"11\",3,[\"1-2\"],2];"],
			// A string an unread `+` adds to a string goes, the strings left of it read as strings only; read, the `+` stays.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-21"), {}, "\"\"+b+d,a+\"\"+c,\"\"+b+d,f()+\"\"+g(),a+b+\"\"+d,\"\"+(b+\"c\")+d,x=\"a\"+b+\"c\"+d;"],
			// What may run code keeps its call, `typeof` or `??`; a reduced call's string is read off once printed.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-22"), {}, "x=[\"/d/\",typeof(a===f()),\"a\",1,\"ab\".length,[...a,\"b\"].join(),(y,-a),(y,z)??1,(y,1)];"],
			// A comment at a call's edge keeps it whole.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-23"), {}, "x=[{...(()=>{})()/*! c */},/*! c */\"ab\".charAt(0)];"],
			// Without `dead_code`, a conditional keeps the parentheses its place gives it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-24"), { compress: { dead_code: false } }, "x=(1?2:0)||3;"],
			// A `concat` printed as a template converts an array of constants in place.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-25"), { ecma: 2015 }, "x=`a1,2${b}`;"],
			// esbuild's `a?d:(b,c,d)` as `a||(b,c),d`, a nested sequence's last item the tail too, where shorter with the parentheses it adds.
			[fixture("javascript", "e-conditions-1"), {}, "a||(b,c),d,a&&(b,c),d,x=a?c:(b,e,c);"],
			// `t?0:1` is `+!t` and `!t?1:0` is `+!t` where assigned, a merged or hoisted assignment too; passed, `t?1:0` or a test `!` takes parenthesized, it stays.
			[fixture("javascript", "e-conditions-2"), { mangle: false }, "x=+!y,x=+!y,x=y?1:0,f(y?0:1),a=(x=a||b?0:1)?0:1;function g(a,b){return b=+!a,b}function h(o,t){o.b=+!t}"],
			// esbuild's `x===null||x===void 0` as `x==null` where the first assigns `x` or ends an `||` of its own, `&&` too; one name read before it is set, both alike or under `!` stay.
			[fixture("javascript", "e-conditions-3"), { mangle: false }, "v=a===1||a==null,v=a!==1&&a!=null,v=(b=f())==null,v=(b=f())!=null&&b!==1,v=c===1||(b=f())==null,v=b===null||(b=f())===void 0,v=(b=f())===null||b===null,v=!(a===1||a===null||a===void 0);"],
			// esbuild's `a?b:a` as `a&&b`, read once as `a?a:b` is, but not where `b` takes parentheses there or calls a function written in place.
			[fixture("javascript", "e-conditions-4"), { mangle: false }, "a&&b,x=a&&(b,c),x=a?b||c:a,x=a?function(){}():a;function f(a){return a&&b}"],
			// Neither where `with` may answer the name.
			[fixture("javascript", "e-conditions-5"), { mangle: false }, "with(o)v=a===1||a===null||a===void 0,a?b:a;"],
			// esbuild's `(a,b)?c:d` as `a,b?c:d` where a sequence stands bare, but not where the last value, or what an assignment before it leaves, binds looser or the first may open a statement.
			[fixture("javascript", "e-conditions-6"), { mangle: false }, "a,b?c:d,f(),a(),b?c:d,x=(a(),b)?c:d,(a(),b=g())?c():d(),(a(),b?e:f)?c():d(),g(),b?c():d();function g(){return a(),b?c:d}if(a(),b?c:d)g();function k(n){return(n=x())?n++:u()}"],
			// terser's `t?f(a):f(b)` as `f(t?a:b)` for an `if` printing as `?:` and for `new` too, but not past a test or argument before that runs something, nor for a call of a call.
			[fixture("javascript", "e-conditions-7"), { mangle: false }, "function f(o,e){o(e?x:y)}function g(o,e){o(e?x:y,1),h()}function k(o,e){new o(e?1:2),new o(e?1:2)}function l(o,e){e()?o(x):o(y),e?o(x)(1):o(y)(1),e?o(h(),x):o(h(),y)}"],
			// terser's `if(t)a=x;else a=y` as `a=t?x:y` for a global set with `=`, as a conditional merges it; a compound one or two names stay.
			[fixture("javascript", "e-conditions-8"), { mangle: false }, "function f(){y=x?3:4,x?y+=3:y+=4,x?y=3:z=4}"],
			// terser's `x?y:y` for an optional chain too, but not where a call reads `this` off it.
			[fixture("javascript", "e-conditions-9"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "a,b?.c,a,b?.(),x=(a,b?.[c]),x=(a?b?.c:b?.c)();"],
			// esbuild's `if(x!=null)x.y()` as `x?.y()`, `if(x==null);else x.y()` too, joining the statements beside it; not where a guard or the `if` holding it continues its test, nor for a write or another name.
			[fixture("javascript", "e-conditions-10"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function f(a){a?.b()}function g(a){a?.b(),a?.(1),h()}function k(a,t){if(!t&&a!=null)a.b()}function l(a,t){if(t&&a!=null)a.b();if(a!=null)a.b=1;if(a!=null)b.c()}"],
			// Nor where `with` may answer the name.
			[fixture("javascript", "e-conditions-11"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "with(o)if(a!=null)a.b();"],
			// `x!=null?x:y??z` is `x??y??z`, a `??` of names grouping alike either way, a conditional printing as one too; a call there stays.
			[fixture("javascript", "e-conditions-12"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function f(a,b,c){x=a??b??c,x=a??b??c.d,x=a!=null?a:b()??c}function g(a,b,c){return a??b??c}"],
			// A body ending in an `if` that prints no `else` of its own, as one running nothing goes, takes braces before the `else` after it.
			[fixture("javascript", "e-conditions-13"), { mangle: false }, "if(x){if(y)foo()}else bar();if(x){if(!y)foo()}else bar();if(x){for(;;)if(y)foo()}else bar();if(x){if(y)foo()}else bar();x?y?foo():g():bar();"],
			// Nobody reading it, a loose or ordering comparison of two primitives runs only its sides, as a strict one does, which print bare in the sequence; one side that may be an object stays.
			[fixture("javascript", "e-conditions-14"), { mangle: false }, "a+\"\",b|c,b+\"\",a|0,b|0,a,b,f(),g(),h(),a==b,a+\"\"<b,x=a+\"\"==(b|c);"],
			// terser's `join_vars` of `var x;x=x||1` as `var x=x||1`, a `var` reading there what it held, but not a `let` in its dead zone, nor `x=x+1` printing as `x+=1`.
			[fixture("javascript", "e-conditions-15"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "var x=x||1,y;y+=1;function f(a){var a=a??2;let b;b=b||3;return[a,b]}"],
			// A function moved to its one call, a statement, prints as its statements there, braced only where they scope a name; a member named as the function reads not it.
			[
				fixture("javascript", "f-inline-call-1"),
				{ mangle: false },
				"function a(){console.log(1),x()}function b(){if(p)q();r();x()}function c(){if(p)q();r()}function d(){{let v=p();if(v)q();r(v)}x()}function e(){if(p)q();r()}function f(){if(p)q();r();x()}function g(){q();r(2);x()}function h(){(function(){if(p)q();r()})(y)}"
			],
			// A call of a call printing as a function prints as what that returns; a function passed constants, or returning one moved into it, prints as its value; a read set to such a call is parenthesized as that value; an arrow's body takes a call's statements.
			[
				fixture("javascript", "f-inline-call-2"),
				{ mangle: false },
				'function a(){return"x"}function b(){return 1}function c(){return 10}function d(){return function(){return"y"}}function e(){if(p)q();r();x()}function f(){return(()=>y)()}function g(){return(0,a.b)()}function h(){return(k(),a.b)()}const i=()=>{if(p)q();r()},j=()=>{x();r(p())};'
			],
			// A call's `var`s become the function's around it where no name there or read in it, nor another such call's, is theirs, mangled clear of them; a program's stay.
			[
				fixture("javascript", "f-inline-call-3"),
				{},
				"function a(){var v=f();if(v)g(v);x()}function b(){!function(){var v=f();if(v)g(v)}(),v()}function c(v){!function(){var v=f();if(v)g(v)}(),x(v)}function d(){var v=f();if(v)g(v);!function(){var v=f();if(v)g(v)}()}function e(){var v=h();var n=f();if(n)g(()=>n);x(v)}!function(){var v=f();if(v)g(v)}(),x();"
			],
			// A call of a function printing empty, passing nothing that prints, is `void 0`: returned it goes, kept for its effect it prints nothing; an async one's promise stays.
			[
				fixture("javascript", "f-inline-call-4"),
				{ mangle: false },
				"function a(){}function b(){x(void 0)}function c(){g()}function d(){}function e(){return function(n){}(y)}function f(){x(async function(){}())}function g(){if(y)return;z()}"
			],
			// A call passing names never written prints as its statements, each parameter the name, but not where a function, block name or catch could hide one, a name passed is written, or the body is longer than two statements.
			[
				fixture("javascript", "f-inline-call-5"),
				{ mangle: false },
				"function a(x){if(x===1)throw Error()}function b(x,z){if(x)g(z);h()}function c(x){!function(y){if(y)g(()=>y)}(x)}function d(x){!function(y){let q=y();g(q,q)}(x)}function e(x){x=2,function(y){if(y)g(y)}(x)}function f(x){!function(y){if(y)g();h(),k(y)}(x)}"
			],
			// A declaration printing only the call its one name, read nowhere, was set to prints the call's statements; a name read keeps the call.
			[
				fixture("javascript", "f-inline-call-6"),
				{ mangle: false },
				"function a(){if(p)q();r();x()}function b(){{let v=p();if(v)r(v)}x()}function c(){x(function(){if(p)q();r()}())}function d(){(function(){if(p)q();r()})();x(1)}"
			],
			// A call's statements an `if` before it prints as its `else` or body keep their braces.
			[
				fixture("javascript", "f-inline-call-7"),
				{ mangle: false },
				"function a(c){if(c)y();else{x();if(b)d()}}function b2(c){if(c)y();else{x();if(b)d()}}function e(c){if(!c){x();if(b)d()}}function f(c){if(c){y();return}x();if(b)d()}"
			],
			// Nothing reading a call printing as its statements, the `return` ending them prints what its value runs; a module's own `var`s take a call's.
			[
				fixture("javascript", "f-inline-call-8"),
				{ module: true, mangle: false },
				"export function a(){if(p)q();r(),s;x()}export function b(){if(p)q();x()}export function c(){return function(){if(p)q();return r()}()}export function d(){if(p)q();r();x()}var v=f();if(v)g(v);x();"
			],
			// A call nothing reads of a function holding a directive alone runs nothing; read, it stays.
			[fixture("javascript", "f-inline-call-9"), {}, 'y=function(){"use strict";return 1}(),x();'],
			// `~` of `undefined` is -1, an empty function's call's too.
			[fixture("javascript", "f-inline-call-10"), {}, "y=-1,z=-1,w=~void f(),x();"],
			// A conditional setting one member of `this` alike in both branches sets it once, whatever the test runs; before a constructor's `super()` it stays.
			[fixture("javascript", "k-conditions-1"), { mangle: false }, "this.b=+!x;function f(t){this.c=t()?a:b}class A extends B{constructor(){x?this.d=0:this.d=1,super(),this.e=y()?2:3}}"],
			// Read as a value, an integer compared unequal with `0` is `!!` of it where that is shorter: not bare after `<<`, in parentheses or as a branch.
			[fixture("javascript", "k-conditions-2"), {}, "f(!!(a&1)),f((a|b)!==0),f(!!~a),f(a<<1!=0),x=y+((a&1)!=0),x=c?(a&1)!=0:(b&1)!=0;"],
			// A merged call or assignment of its test's own name is `t||b` or `t&&b`, as `printsOr` and `printsAnd` have it; one taking parentheses there stays `?:`.
			[fixture("javascript", "k-conditions-3"), { mangle: false }, "function f(a,b,c,x){return b(a||c),b(a&&c),b(a?a:c=1),b(a||c),x=a||c,x=a&&c,x=a||c(),x=a?a:c?1:2,x.y=a||c,x}"],
			// From ES2020, `if(x==null)y` and `if(x!=null);else y` are `x??y` where `x` prints as a name or member, `y` parenthesized where it binds looser; a block of more than expressions stays.
			[fixture("javascript", "k-conditions-4"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "function f(a,b){a??a.b(),a??b(),a.c??(a.c=b,b=0),a??(b=a?1:2),a??(b?a():b());if(a==null){b();if(a)b()}if(a()==null)b();return b}"],
			// Before ES2020 they stay `if`s.
			[fixture("javascript", "k-conditions-5"), { mangle: false }, "function f(a,b){if(a==null)a.b();if(a==null)b();if(null==a.c)a.c=b,b=0;if(a==null)b=a?1:2;if(a==null)b?a():b();if(a==null){b();if(a)b()}if(a()==null)b();return b}"],
			// terser's `if_return` guards a `var` after the `if`, which declares its names as a body too; a `let` stays apart.
			[fixture("javascript", "k-conditions-6"), { mangle: false }, "function f(y){if(!y)var y}function g(x,y){while(x)if(!y)var y=x()}function h(y){if(!y)use(y())}"],
			// From ES2016, `Math.pow` of a number is `**`, its sides and itself parenthesized where they bind looser, or of constants the number `**` folds to where shorter; of two unknown values, whose `valueOf` `**` reads in another order, or a local `Math`, it stays.
			[fixture("javascript", "k-conditions-7"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "x=[a**3,2**b,Math.pow(a,b),(a+b)**2],x=-(a**2),x=(a**2).toFixed(),x=(-a)**2+2**-a+(a**2)**2,x=y*a**.5+a**1e-7,({valueOf:f})**2,x=Math.pow(2n,b);function f(Math){return Math.pow(a,2)}x=[8,2**.5,(-2)**3];"],
			// Before ES2016, `Math.pow` stays.
			[fixture("javascript", "k-conditions-8"), { mangle: false }, "x=[Math.pow(a,3),Math.pow(2,b),Math.pow(a,b),Math.pow(a+b,2)],x=-Math.pow(a,2),x=Math.pow(a,2).toFixed(),x=Math.pow(-a,2)+Math.pow(2,-a)+Math.pow(Math.pow(a,2),2),x=y*Math.pow(a,.5)+Math.pow(a,1e-7),Math.pow({valueOf:f},2),x=Math.pow(2n,b);function f(Math){return Math.pow(a,2)}x=[Math.pow(2,3),Math.pow(2,.5),Math.pow(-2,3)];"],
			// A `*` of a number or a name nothing writes times a `*`, `/` or `%` prints that one first, its parentheses gone; a global, a name written or read in its dead zone stays last.
			[fixture("javascript", "k-conditions-9"), { mangle: false }, "function f(a,b,c){return[b%c*a,b/c*2,b*c*a*2,a*(b+c),x*(b/c)]}function g(a,b,c){return(a=c)*(b/c)}function h(b,c){return a*(b/c);let a=1}"],
			// terser's `dead_code` of an `if` whose test's truth is known though it runs something: the test runs unread, then the branch it keeps, joined where it is expressions; a nested `if` or a declaration stays.
			[fixture("javascript", "k-conditions-10"), { mangle: false }, "x(),y();x();foo();for(;;)x(),y();function f(){return g(),a(),b(),1}a(),b();if(x()||1)if(u)v();if(x()||1)use(1);for(;;)x(),a(),b();x(),y(),x(),a(),b();if(x()&&0)y();else if(u)v();"],
			// A sequence whose known truth, or whether it is nullish, hands `||`, `&&` or `??` to its right side prints as that side's sequence, its last value unread.
			[fixture("javascript", "k-conditions-11"), { mangle: false }, "x((y,1),(y,0),(y,1),(y,a.b,1)+2),x((y,2),(y,1));"],
			// A body whose `if`s leaving alike print as one takes no braces, as one statement.
			[fixture("javascript", "k-conditions-12"), { mangle: false }, "while(x)a||b;for(;;)if(a||b)break;function f(){if(x){if(a||b)return}else z();while(x)throw y,x}"],
			// A body whose `if` and the `throw` after it print as one `throw` takes no braces, as one returning does.
			[fixture("javascript", "k-conditions-13"), { mangle: false }, "function f(){while(x)throw y?a:b}"],
			// A `+` of a template piece ending in `$` and one opening with `{` joins as one template, the `$` escaped where no backslash escaped it already.
			[fixture("javascript", "k-conditions-14"), { mangle: false, ecma: 2020, compress: { toplevel: false, ecma: 2020 } }, "x=[`\\${${x}}`,`a\\${${x}}`,`\\${${x}}`,`${y}\\${${x}}`,`\\\\\\${${x}}`,`${y}\\${a`,`\\${${x}}`];"],
			// A `var` function of one statement called once in a function expression made after it moves there, but not into a declaration, a loop or a read made before it, nor one of more statements.
			[
				fixture("javascript", "m-inline-call-1"),
				{ mangle: false },
				"function a(r){r.O(0,[2],function(){return r(r.s=8484)})}function b(r){var e=function(m){return r(m)};return function(){return e(1)}}function c(r){if(r)var e=function(m){return r(m)};return function(){return e(1)}}function d(r){var e=function(m){return g(),r(m)};return function(){return e(1)}}function f(r){var e=function(m){return r(m)};for(;;)g(function(){return e(1)})}function k(r){g(function(){return e(1)});var e=function(m){return r(m)}}"
			],
			// A named function called once in a function expression stays, a call there making a new one its name reads each time.
			[
				fixture("javascript", "m-inline-call-9"),
				{ mangle: false, compress: { toplevel: true } },
				"var result=[],named=function foo(){result.push(foo)};[0,1].map(()=>named()),[0,1].map(()=>function(){result.push(1)}());"
			],
			// A function returning a value, called once in a loop passing nothing, prints as that value there, but not one taking parameters, reading its own `this` or `arguments`, or returning nothing.
			[
				fixture("javascript", "m-inline-call-2"),
				{ mangle: false },
				"function a(){for(;;)x()}function b(){while(y)h(x())}function c(){for(;;)h(q)}function d(){var f=function(){return x()};for(;;)f(y)}function e(){var f=function(n){return x(n)};for(;;)f()}function g(){var f=function(){return this.x};for(;;)h(f())}function i(){var f=function(){return arguments};for(;;)h(f())}function j(){var f=function(){x()};for(;;)f()}"
			],
			// A call passing literals or empty functions past its parameters prints as its statements or value; a name or a function running something passed keeps the call, as `arguments` read does.
			[
				fixture("javascript", "m-inline-call-3"),
				{ mangle: false },
				"function a(){x()}function b(){x()}function c(){return x}function d(){!function(){x()}(y)}function e(){!function(){x()}(function(){y()})}function f(){!function(){x(arguments)}(1)}"
			],
			// A function moved where a name it reads is shadowed moves still where that read prints a function moved into it, but not where that function stays.
			[
				fixture("javascript", "m-inline-call-4"),
				{ mangle: false, compress: { toplevel: true } },
				"function z(){console.log(1);console.log(2)}z(),z();var q=g();function a(){b()}function b(){console.log(q)}function c(){function b(){console.log(3)}a(),b(),b()}c(),c();"
			],
			// Functions each read once in the next, round to the first, stay in place for the cycle to go; a chain read from outside moves.
			[fixture("javascript", "m-inline-call-5"), { mangle: false }, "function a(){x()}function b(){x()}function c(){z()}"],
			// A literal read once in the next statement is made there where each name it reads is set before and never written, but not a parameter `arguments` may set, a name in its dead zone or a script's global.
			[
				fixture("javascript", "m-collapse-2"),
				{ mangle: false },
				"function a(p){h(g(),[p])}function b(p){h(g(),{p:p,k:function(){}}.k())}function c(p){var o=[p];h(arguments[0]=2,o)}function d(p){var o=[1];h(g(),o)}function e(){let o=[q];h(g(),o);let q=1}var t=1;function f(){var o=[t];h(g(),o)}"
			],
			// A named function called in place passing constants prints as its value where nothing reads its name, which may call it again.
			[fixture("javascript", "m-inline-call-6"), { mangle: false }, "x=g(3),y=function f(a){if(a)f(a-1);return g(a)}(2),z=function f(a){return g(a,f)}(2);"],
			// A `var` a dropped statement still declares counts as the call's own: where its name is the function's around, or a script's, the call stays.
			[
				fixture("javascript", "m-inline-call-7"),
				{ mangle: false },
				"function a(){var v=f();!function(){var v;h(v)}(),h(v)}function b(){var v=f();!function(){h(v);var v}(),h(v)}function c(){var v;h(v);h(w)}!function(){var v;h(v)}(),x();"
			],
			// A named function called in place prints as its statements where nothing reads its name.
			[fixture("javascript", "m-inline-call-8"), { mangle: false }, "function a(){if(p)x();y();z()}function b(){!function f(){if(p)f();y()}(),z()}function c(){if(p)x();y();z()}"],
			// A literal read once in a later statement is made there, one of several declarators too, but not into a loop, function or block, whose names may mangle as one it reads, nor where a name between hides one it reads.
			[
				fixture("javascript", "m-collapse-3"),
				{ mangle: false },
				"function a(p){g(),h([p])}function b(p){if(g())h({x:p})}function c(p){var o=[p];for(g();;)h(o)}function d(p){var o=[p];g(()=>o)}function e(p){var o=[p];g();h(o,q())}function f(p){var o=[p];g();try{h(o)}catch(p){k(p)}}function g2(p){var n=k();g(),h([p],n)}"
			],
			[fixture("javascript", "m-collapse-4"), { module: true }, "export function m(o){var p={x:o};if(g()){let o=k();h(p,o,o)}}"],
			// A value reading a local folds into no `let` head, whose names may mangle as that local; one reading globals or under `var` folds.
			[
				fixture("javascript", "m-collapse-5"),
				{ module: true },
				"export function a(o){var q=o.x;for(let o=h(q);o;o--)g(o,o)}export function b(o){var q=[o];for(let o=h(q);o;o--)g(o,o)}export function c(o){for(let q=h(e(t));q;q--)g(q,q,o)}export function d(o){for(var q=h(o.x);q;q--)g(q,q)}"
			],
			// A literal read only by an `export` list stays declared: the list takes names, not values.
			[fixture("javascript", "m-collapse-6"), { module: true }, "var c={a:function(){return b()}},e=[b];export{c,e};"],
			// A literal read too far on stays where it is, the search for the read bounded.
			[`function f(p){var o=[p];${"g();".repeat(3000)}h(o)}`, { mangle: false }, `function f(p){var o=[p];${"g(),".repeat(3000)}h(o)}`],
			// A module's or private top level's name read once, by a call reading a global first, prints its value there, as a function's does; a script's stays.
			[fixture("javascript", "m-collapse-1"), { module: true, mangle: false }, "g(z()),h(y());"],
			[fixture("javascript", "m-collapse-1"), { mangle: false, compress: { toplevel: true } }, "g(z()),h(y());"],
			[fixture("javascript", "m-collapse-1"), { mangle: false }, "let a=z();g(a);var b=y();h(b);"],
			// An `if` printing as its test runs takes no `&&` of the `if(!t)` before it.
			[fixture("javascript", "m-guarded-rest-1"), { mangle: false }, "function a(){if(!c)g()}function b(){if(!c)(function(){c}())}"],
			// A bare `return` the `if(!t)` before it takes as its body stays, ending its function.
			[fixture("javascript", "m-guarded-rest-2"), { mangle: false }, "(()=>{if(!c)return})(a);function f(){if(!c)return}"],
			// An `if` printing its test then its kept statements, as the `if(!t)` before it's body or as an `else`, takes braces.
			[fixture("javascript", "m-guarded-rest-3"), { mangle: false }, "function a(skip){if(!skip){log();{work(),done()}}}function b(skip){if(skip)g();else{log();{work(),done()}}}"],
			// A body printing nothing is `;`, which the `}` after it keeps.
			[fixture("javascript", "m-empty-body-1"), { mangle: false }, "function f(){while(a());}function g(){for(x in a);}"]
		];
		for (const [source, options, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false },
				...options
			});
			expect(code).toBe(expected);
		}
		// A regexp source this engine rejects, as an older one rejects duplicate group names, stays unread.
		let readsDuplicateGroups = true;
		try {
			// eslint-disable-next-line prefer-regex-literals
			new RegExp("(?<a>x)|(?<a>y)");
		} catch (_err) {
			readsDuplicateGroups = false;
		}
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-706"), {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			}).code
		).toBe(
			readsDuplicateGroups
				? 'function f(){return"(?<a>x)|(?<a>y)"}'
				: "function f(){return/(?<a>x)|(?<a>y)/.source}"
		);
		// Converted to a string, it stays as it is too.
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-literals-26"), {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			}).code
		).toBe(
			readsDuplicateGroups
				? 'function f(){return"/(?<a>x)|(?<a>y)/"}'
				: 'function f(){return""+/(?<a>x)|(?<a>y)/}'
		);
		// A test printed without its `!` keeps where its names were in the map.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped = /** @type {{ code: string, map: { names: string[] } }} */ (
			new SourceProcessor().process(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-707"),
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(mapped.code).toBe("function f(a,b){if(a!=b)g(c?2:1,a!==b||x)}");
		expect(mapped.map.names).toEqual(
			expect.arrayContaining(["a", "b", "c", "g", "x"])
		);
		// A brace dropped once printed moves the names after it back in the map.
		const unbraced = /** @type {{ code: string, map: { mappings: string } }} */ (
			new SourceProcessor().process(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-708"),
				{
					mode: "minify",
					compress: { toplevel: false },
					mangle: false,
					source: "a.js"
				}
			)
		);
		expect(unbraced.code).toBe("function f(){for(;;)if(!xx)yy(),zz()}");
		// cspell:disable-next-line
		expect(unbraced.map.mappings).toBe("AAAA,SAASA,IAAI,OAAQ,IAAGC,GAAYC");
		// Every comment kept is still the compressor's to keep.
		const { code } = minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-compress-in-the-one-pass-709"), {
			compress: {},
			mangle: {},
			format: { comments: "all" }
		});
		expect(code).toBe("if(a){b()}/* c */");
	});

	it("should print as the format options ask in the one pass", () => {
		/** @type {[string, import("../../../lib/javascript/syntax-printer").MinifyOptions, string][]} */
		const cases = [
			// A comments option written as a regexp, a function, `some`, or anything else true
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options"), { compress: {}, format: { comments: "/keep/" } }, "/* keep */a();b();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options"), { compress: {}, format: { comments: (_node, comment) => comment.value.includes("keep") } }, "/* keep */a();b();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-2"), { compress: {}, format: { comments: "some" } }, "/*! lic */a();// @license x\nb();c();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-3"), { compress: {}, format: { comments: "all" } }, "/* a */x();// b\ny();\n/*\n multi\n*/z();"],
			// An annotation alone is kept, its own comment or not; one in prose prints nowhere
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-4"), { compress: {}, format: { preserve_annotations: true } }, "/*#__PURE__*/f();/* @__NOINLINE__ */g();"],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-5"),
				{ compress: {}, format: { comments: false, preserve_annotations: true } },
				"a();/*#__PURE__*/f();"
			],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-6"), { compress: {}, format: { comments: "all" } }, "/* <\\/script> */a();b();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-7"), { compress: {}, format: { comments: "all" } }, "function f(){/* a */return x+/* b */y}function g(){// c\nreturn x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-8"), { compress: {}, format: { comments: "all" } }, "a=/* x */b/* y */,c=// l\nd;e=\n/* z */f;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-9"), { compress: {}, format: { comments: "all" } }, "f(),g({/* b */}),h([]);function k(){/* d */}class C{}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-10"), { compress: {}, format: { comments: "all" } }, "x=1;// t"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-11"), { compress: {}, format: { comments: "all" } }, "#!/usr/bin/env node\n/* a */x();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-11"), { compress: {}, format: { comments: "all", shebang: false } }, "/* a */x();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-12"), {}, "#!/usr/bin/env node\nfoo();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-13"), { compress: {}, format: { comments: "all", preamble: "/* pre */\r\nline" } }, "/* pre */\nline\n/* a */x();"],
			// `ascii_only` escapes what is past ASCII, as the edition and engine allow
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-14"), { format: { ascii_only: true } }, "x=\"\\xe9\\ud83d\\ude00\\u0100\";y=/\\xe9/;var \\u00e9=1;z={\"\\xe9\":1};"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-15"), { ecma: 2015, format: { ascii_only: true } }, "x=\"\\xe9\\u{1f600}\\u0100\";y=/\\xe9\\u{1F600}/u;"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-16"), { ecma: 2015, format: { ascii_only: true, safari10: true } }, "x=\"\\xe9\\ud83d\\ude00\";"],
			// A lone surrogate is escaped, a pair left as it is
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-17"), {}, "x=\"\\ud800\"+\"\\udc00x\"+\"😀\";"],
			// A name past Unicode 8 is escaped, which older engines read
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-18"), {}, "var \\u{1e900}=1;o[\"𞤀a\"]=\\u{1e900};var a\\u{1e900}=2;o.x=a\\u{1e900};"],
			// Escapes, and the quotes each `quote_style` picks
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-19"), {}, "x=[\"\\n\\r\\t\\b\\f\\v\\u2028\\u2029\\ufeff\\0 \\x001\\\\\",\"a'\",'b\"','\\'\"\"'];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-20"), { format: { ie8: true, quote_style: 1 } }, "x=['\\x0B','a\\'','b\"','\\'\"\"'];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-21"), { format: { quote_style: 2 } }, "x=[\"a'\",\"b\\\"\",\"'\\\"\\\"\",\"c\",\"d\"];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-21"), { format: { quote_style: 3 } }, "x=[\"a'\",'b\"',\"'\\\"\\\"\",'c',\"d\"];"],
			// Without `semicolons`, a statement ends in a line break where the next allows
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-22"), { format: { semicolons: false } }, "a()(b)()[c]\nd`x`\n"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-23"), { format: { semicolons: false } }, "a()\nb()\nc+d\n"],
			// An edition given by its number counts from 2015
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-24"), { ecma: 6, compress: {} }, "x={a,b:function(){}};"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-24"), { ecma: 5, compress: {} }, "x={a:a,b:function(){}};"],
			// A long string's tabs are written raw
			[`x = 'a\\tb\\tc ${"abc ".repeat(30)}'`, {}, `x="a\tb\tc ${"abc ".repeat(30)}";`],
			// A regular expression's flags print in order
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-25"), {}, "x=[/a/gi,/b/dgimsy];"],
			// A pattern's NUL is escaped, its `</script` too, and a backslash before a letter past ASCII goes.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-26"),
				{},
				"x=/a\\0b/;y=/\\0/;z=/[<\\/script>]/;w=/é\\d\\\\/;"
			],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-the-format-options-27"), { compress: {} }, "x=RegExp(\"</script\"),y=\"\\x3c!--\\\\\\x3c!--<\\/script>--\\x3e\";"],
		];
		for (const [source, options, expected] of cases) {
			expect(minifyOnePass(source, options).code).toBe(expected);
		}
	});

	it("should refuse an option it does not know, and a module statement off the top level", () => {
		expect(() => minifyOnePass(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), { mangle: /** @type {EXPECTED_ANY} */ ({ nope: 1 }) })).toThrow(
			"`nope` is not a supported option"
		);
		expect(() => minifyOnePass(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), { format: /** @type {EXPECTED_ANY} */ ({ nope: 1 }) })).toThrow(
			"`nope` is not a supported option"
		);
		// A script reads module syntax anywhere, which the scopes then refuse.
		expect(() =>
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-refuse-an-option-it-does-not"), { mangle: true })
		).toThrow(
			expect.objectContaining({
				name: "SyntaxError",
				message: '"Import" statement may only appear at the top level',
				line: 2,
				col: 2,
				pos: 16
			})
		);
	});

	it("should forget what the last one-pass print found", () => {
		const source =
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-forget-what-the-last-one-pass");
		const unmangled = () =>
			minifyOnePass(source, { compress: {}, mangle: false }).code;
		const first = unmangled();
		minifyOnePass(source, {
			compress: { side_effects: false },
			mangle: {}
		});
		expect(unmangled()).toBe(first);
		expect(first).toBe("it(()=>[g(1),g(2)]);");
	});

	it("should keep the parentheses a binary takes under a `!` of `!!`", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(e,t,g){return[${source}]}`, {
				compress: {},
				mangle: false
			}).code.slice(25, -2);
		for (const [source, expected] of [
			["!!!(e&6)", "!(e&6)"],
			["!!(!(e+t))", "!(e+t)"],
			["!!!(e===t)", "!(e===t)"],
			["!!!(e&6)?t:g", "e&6?g:t"],
			// Read only for its truth elsewhere, `!!x` still prints as `x`.
			["!!(e&6)?t:g", "e&6?t:g"]
		]) {
			expect(print(source)).toBe(expected);
		}
		for (const [source, value] of [
			["!!!(e&6)", [false, true]],
			["!!(!(e+t))", [false, true]]
		]) {
			const { code } = minifyOnePass(`function f(e,t){return ${source}}`, {
				compress: {},
				mangle: false
			});
			expect([
				vm.runInNewContext(`${code}f(2,0)`),
				vm.runInNewContext(`${code}f(0,0)`)
			]).toEqual(value);
		}
	});

	it("should fold what `+` adds to a string", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(b,c){return[${source}]}`, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code.slice(23, -2);
		for (const [source, expected] of [
			// A regular expression converts to its text.
			["\"\"+/x/", '"/x/"']
		]) {
			expect(print(source)).toBe(expected);
		}
	});

	it("should fold the conversions `Boolean`, `Number` and `String`", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: false,
				format: { comments: "some" }
			}).code;
		for (const [source, expected] of [
			// `Boolean(x)` is `!!x`, or `x` where that is a boolean already.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-fold-the-conversions-boolean-2"),
				"a=!!b,f(!b),x={k:b?c>0:c<0},y=[!!(b|+c)];function g(){return b in c}var z=!!b;b?1:!1,u=[!!c,delete b.c,b>1];"
			]
		]) {
			expect(print(source)).toBe(expected);
		}
	});

	it("should print an `if` whose branches print alike as its test and one branch", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(source, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code;
		for (const [source, expected] of [
			// A local name runs nothing, a global may throw.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches"), "function f(v){g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-2"), "y,f();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-3"), "function f(y){var x;return x=2,x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-4"), "function f(){var x;return x=(c(),1),x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-5"), "a?x=b?1:2:(c,f());"],
			// Returned alike, the `return` prints the test where it runs anything.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-6"), "function f(y){return 1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-7"), "function f(y){return g(),1}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-8"), "function f(y){return y?1:2}"],
			// An item of a sequence takes a sequence or assignment bare, a function parenthesized.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-9"), "function f(y){var n=0;return n++,y,g(),n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-10"), "function f(y){var n;return n=y,g(),n}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-11"), "(function(){h()})(),g();"],
			// After a `:` a returned sequence would close on its semicolon.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-12"), "function f(a,b){return a?1:g(b)?2:2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-13"), "function f(a,b){return a?1:2}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-14"), "function f(a,b){if(a)return g(b),2;return 3}"],
			// Comments both branches keep would print once.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-15"), "y?f(/*! c */1):f(/*! c */1);"],
			// A comment kept or branches printing otherwise keep the `?:`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-16"), "if(y)f();else/*! c */f();"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-17"), "y?f():g();"],
			// A dropped test keeps a comment it holds, and a branch alone opening the statement takes no `{` or `class`.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-18"), "function f(t){return t/*! c */?g():g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-19"), "function f(t){t/*! c */?g():g()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-20"), "function f(v){v?{}.a():{}.a()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-21"), "function f(v){v?class{}.a():class{}.a()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-22"), "function f(v){var x;return x=class{}.a,x}"],
			// A shared sequence takes no parentheses after the test's comma or alone, but assigned or opening ambiguously.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-23"), "function f(c){g(),h()}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-24"), "function f(c,d){d?k():(c(),g(),h())}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-25"), "function f(c){var x;return x=(g(),h()),x}"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-26"), "function f(c){({}.a(),h())}"]
		]) {
			expect(print(source)).toBe(expected);
		}
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		// Printed from its text, the shared sequence still maps where it came from.
		const mapped =
			/** @type {{ code: string, map: { mappings: string, names: string[] } }} */ (
				new SourceProcessor().process(
					fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-an-if-whose-branches-23"),
					{ mode: "minify", compress: {}, mangle: false, source: "a.js" }
				)
			);
		expect(mapped.code).toBe("function f(c){g(),h()}");
		expect(mapped.map.names).toEqual(expect.arrayContaining(["g", "h"]));
	});

	it("should print a `+` adding to a template, or a template within one, as one template", () => {
		const print = (/** @type {string} */ source) =>
			minifyOnePass(`function f(x,y,g){return[${source}]}`, {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			}).code.slice(25, -2);
		for (const [source, expected] of [
			["`a${x}`+'b'", "`a${x}b`"],
			["1+`a${x}`", "`1a${x}`"],
			["`a${x}`+`b${y}`", "`a${x}b${y}`"],
			["`a${x}`+1+true", "`a${x}1`+!0"],
			["`a${x}`+'b'+'c'", "`a${x}bc`"],
			["(`a${x}`+1)+'b'+'c'", "`a${x}1bc`"],
			["1+2+`a${x}`", "`3a${x}`"],
			// A template printing as a string adds as one.
			["`a${1}`+`b${x}`", "`a1b${x}`"],
			["(`a${x}`+1).length", "`a${x}1`.length"],
			["`a${`b${x}c`}d`", "`ab${x}cd`"],
			["`a${`b${x}`+1}c`", "`ab${x}1c`"],
			// A `$` and a `{` joined would open a substitution, so the `$` takes a backslash.
			["'a$'+`{${x}}`", "`a\\${${x}}`"],
			["`${x}a$`+'{b}'", "`${x}a\\${b}`"],
			["`${x}$`+`{${y}}`", "`${x}\\${${y}}`"],
			["`${x}$`+'b'+'{c}'", "`${x}$b{c}`"],
			["`${x}$`+'{b}'+'c'", '`${x}$`+"{b}c"'],
			["`a$${`{${x}}`}`", "`a$${`{${x}}`}`"],
			["`${`${x}$`}{y}`", "`${`${x}$`}{y}`"],
			// `\\0` then a digit would read as an octal escape.
			["`a${x}\\0`+'1'", '`a${x}\\0`+"1"'],
			["`a${`b${x}\\0`}1`", "`a${`b${x}\\0`}1`"],
			["`a${x}\\0`+'b'", "`a${x}\\0b`"],
			// A NUL a literal holds prints as `\\0` too, and a part printing empty keeps what printed before it.
			["'\\0'+`1${x}`", '"\\0"+`1${x}`'],
			["`\\0${`1${x}`}`", "`\\0${`1${x}`}`"],
			["`${`\\0`}${`1${x}`}`", "`\\0${`1${x}`}`"],
			["`${`a${x}$`}${`{b${x}}`}`", "`a${x}$${`{b${x}}`}`"],
			// Another operand, a comment kept or a tag keep the `+` or the template.
			["`a${x}`+y", "`a${x}`+y"],
			["`a${x}`+null", "`a${x}`+null"],
			["`a${x}`-1", "`a${x}`-1"],
			["`a${x}`+/*! c */'b'", "`a${x}`+/*! c */\"b\""],
			["/*! c */`a${x}`+'b'+'c'", "/*! c */`a${x}`+\"bc\""],
			["x+'b'+'c'", 'x+"bc"'],
			["g`a${`b${x}`}c`", "g`a${`b${x}`}c`"],
			["`a${/*! c */`b${x}`}c`", "`a${/*! c */`b${x}`}c`"]
		]) {
			expect(print(source)).toBe(expected);
		}
		// What the joined templates printed maps to where it was read.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped = new SourceProcessor().process(
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-adding-to-a-template"),
			{ mode: "minify", compress: {}, mangle: false, source: "in.js" }
		);
		expect(mapped.code).toBe("f(`a${x}b${y}`,`cd${z}e`);");
		expect(mapped.map).toEqual(
			expect.objectContaining({
				mappings: "AAAAA,EAAE,IAAIC,CAAI,IAAIC,IAAK,CAAI,IAAIC"
			})
		);
		// A name kept for its size stays a name, a short one folds.
		expect(
			minifyOnePass(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-adding-to-a-template-2"),
				{ compress: {}, mangle: false }
			).code
		).toBe(
			'function h(x){let K="a long string the printer keeps";return[`a${x}`+K,K,K]}'
		);
	});

	it("should read terser's compress options that name calls, globals and names", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ compress = {}
		) => minifyOnePass(source, { compress, mangle: false }).code;
		// `drop_debugger` drops them unless turned off, where no list holds one too.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress"))).toBe("f();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-2"))).toBe("a;f();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress"), { drop_debugger: false })).toBe(
			"debugger;f();"
		);
		// `drop_console` drops a call whole, what its arguments run with it.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-3"), { drop_console: true })).toBe(
			"g();"
		);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-4"), {
				drop_console: true
			})
		).toBe("f();g();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-5"), { drop_console: ["log"] })
		).toBe("console.warn(2),g();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-6"), { drop_console: true })
		).toBe("console[m](1),c.console.log(1);");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-7"), { drop_console: true })
		).toBe("var console=k;console.log(1);");
		// Where no list holds it, it prints as the `undefined` it returns.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-8"), {
				drop_console: true
			})
		).toBe("if(a);for(;;);x=void 0;");
		// Where a unary cannot stand, it is grouped.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-9"),
				{ drop_console: true }
			)
		).toBe("x=(void 0)**2,y=(void 0).a,z=(void 0)(),w=new(void 0);");
		// So is one called through `call` or `apply`.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-10"), {
				drop_console: true
			})
		).toBe("g();");
		// `pure_funcs` marks the calls it names pure, by how the callee is written.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-11"), {
				pure_funcs: ["foo", "a.b.c"]
			})
		).toBe("a.b.d(3),a[b].c(4),foo(5);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-12"), { pure_funcs: ["foo"] })).toBe(
			"var x=foo(1);h(x);"
		);
		// `global_defs` replaces a global nothing sets with a primitive value.
		const defs = {
			global_defs: { DEBUG: false, VERSION: "1.2", "@code": "x", O: {} }
		};
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-13"), defs)).toBe('g("1.2",O);');
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-14"), defs)).toBe("DEBUG=1,g(DEBUG);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-15"), defs)).toBe(
			"!function(DEBUG){g(DEBUG)}(h);"
		);
		// A shorthand prints its key and the value.
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-16"), {
				compress: defs,
				mangle: false,
				ecma: 2015
			}).code
		).toBe('g({DEBUG:!1,VERSION:"1.2"});');
		// A key with dots names what is read off a global.
		const nested = {
			global_defs: { "process.env.NODE_ENV": "production", "env.DEBUG": 0 }
		};
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-17"),
				nested
			)
		).toBe("g(0,a.env.DEBUG,delete env.DEBUG);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-18"), nested)).toBe(
			"var env={};g(env.DEBUG);"
		);
		// A number a sign or point would join to what is around it is grouped.
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-19"), { global_defs: { V: -1 } })
		).toBe('g((-1).toLocaleString(),1,"number");');
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-20"), { global_defs: { V: -0 } })).toBe("g(a/(-0));");
		// `top_retain` keeps the top-level names it lists, a pattern or a test keeps.
		const top = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-21");
		expect(print(top, { toplevel: true })).toBe("");
		expect(print(top, { toplevel: true, top_retain: "foo, bar" })).toBe(
			"var foo=1,bar=2;"
		);
		expect(print(top, { toplevel: true, top_retain: ["bar"] })).toBe(
			"var bar=2;"
		);
		expect(print(top, { toplevel: true, top_retain: /^f/g })).toBe(
			"var foo=1;"
		);
		expect(
			print(top, {
				toplevel: true,
				top_retain: (/** @type {{ name: string }} */ definition) =>
					definition.name === "bar"
			})
		).toBe("var bar=2;");
		// It implies `toplevel` where that is not given, and keeps a name inlined.
		expect(print(top, { top_retain: "foo" })).toBe("var foo=1;");
		expect(print(top, { top_retain: "foo", toplevel: false })).toBe(
			"var foo=1,bar=2;"
		);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-22"), { toplevel: true, top_retain: "foo" })
		).toBe("var foo=1;g(foo);");
		// `keep_infinity` prints `Infinity` as written.
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-23"))).toBe("x(1/0);");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-compress-23"), { keep_infinity: true })).toBe(
			"x(Infinity);"
		);
	});

	it("should print constant keys, `new` targets and enumerations shorter in the one pass", () => {
		const print = (
			/** @type {string} */ source,
			/** @type {Record<string, unknown>} */ options = {}
		) =>
			minifyOnePass(source, {
				compress: {},
				mangle: {},
				module: true,
				...options
			}).code;
		// A statement calling a function expression prints the call after `!`.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-17")
			)
		).toBe(
			"for(var i;;)g(i);!function(){for(var i;;)g(i)}(),h(),h(),function(){for(var i;;)g(i)}();"
		);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-18"), { compress: { negate_iife: false } })
		).toBe("for(var i;;)g(i);h();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-18"), { format: { wrap_iife: true } })
		).toBe("for(var i;;)g(i);h();");
		// An empty function called where nothing reads it runs only its arguments.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-19")
			)
		).toBe(
			"a(),b(),x(),[...a],y(),c?[...a]:d(),z=void a(),function({a:n}){}(b),function(n=g()){}(b),b;"
		);
		// What a function called where nothing reads its call returns goes, where it runs nothing.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-22")
			)
		).toBe(
			"!function(){try{throw 1}finally{return}}(),x=function(){try{g()}finally{return 2}}(),function(){if(g())return;for(;;)h()}(),async function(){return g(),1}(),g(),h(),a(),g(),b(),function*(){return 1}().next();"
		);
		// A `var` and the statement setting its last name read as one; a `let`
		// stays apart, its dead zone lasting while the value runs.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-47")
			)
		).toBe(
			"export function f(r){r.add([r=>r+1])}export function g(r){var t;return[t,r()]}export function h(){var r=1;return r}export function k(r){let t;t=r();if(r===1){var a;r(a=r(),a)}return[t,t]}"
		);
		// A constant passed to a function called once is its parameter's value.
		expect(
			print(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-constant-keys-new-51")
			)
		).toBe(
			"export const r=[function(t){return 1+t+\"s\"}(g()),6,function(n){return 2}(1),function(n){return arguments[0]+n}(1),function n(t){return n.length+t}(1),1,function(n,t){return n+t}(...a)];export function m(){return h(1,1)}"
		);
	});

	it("should keep a named function a direct eval in a class or function it returns reads", () => {
		const sources = [
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-named-function-a"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-named-function-a-2"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-named-function-a-3")
		];
		for (const source of sources) {
			/** @type {{ result?: unknown }} */
			const context = {};
			vm.runInNewContext(
				minifyOnePass(source, { compress: {}, mangle: {} }).code,
				context
			);
			expect(context.result).toBe("function");
		}
	});

	it("should wrap or enclose the source, mapping what it printed of it", () => {
		const options = { compress: {}, mangle: {} };
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const wrapped = /** @type {{ code: string, map: EXPECTED_ANY }} */ (
			new SourceProcessor().process(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source"),
				{ mode: "minify", ...options, wrap: "lib", source: "a.js" }
			)
		);
		expect(wrapped.code).toBe(
			'!function(e){e.a=1+g()}(typeof lib>"u"?lib={}:lib);'
		);
		// Only the source's own names map, from its second line.
		expect(wrapped.map.names).toEqual(["exports", "longName", "g"]);
		expect(wrapped.map.mappings).toBe("aACAA,IAAYC,EAAWC");
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-2"), {
				...options,
				enclose: "y:7"
			}).code
		).toBe("window.v=8;");
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-3"), { ...options, enclose: true }).code
		).toBe("!function(){window.v=y}();");
		// `enclose` goes around `wrap`; a hashbang, no longer first, goes.
		const bare = { compress: false, mangle: false };
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-4"), {
				...bare,
				wrap: "lib",
				enclose: "window,undefined:window"
			}).code
		).toBe(
			'(function(window,undefined){(function(exports){exports.x=undefined})(typeof lib=="undefined"?lib={}:lib)})(window);'
		);
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-wrap-or-enclose-the-source-5"), { ...bare, enclose: true })
				.code
		).toBe("(function(){foo()})();");
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-each-source-with-names-111"), { ...bare, wrap: "lib" }).code
		).toBe('(function(exports){})(typeof lib=="undefined"?lib={}:lib);');
	});

	it("should print alone the comments it keeps, however they are chosen", () => {
		const bare = { compress: false, mangle: false };
		const print = (/** @type {string} */ source, /** @type {EXPECTED_OBJECT} */ format) =>
			minifyOnePass(source, { ...bare, format }).code;
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it"), {})).toBe("/*! a */f();g();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-2"), {})).toBe("f();/*! late */g();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-3"), {})).toBe("f();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-4"), { comments: false })).toBe("f();");
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-5"), {
				comments: false,
				preserve_annotations: true
			})
		).toBe("/*#__PURE__*/f();g();");
		// A callback is asked only as each comment prints.
		/** @type {string[]} */
		const asked = [];
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-6"), {
				comments: (/** @type {unknown} */ _node, /** @type {{ value: string }} */ comment) => {
					asked.push(comment.value);
					return /keep/.test(comment.value);
				}
			})
		).toBe("/* keep */f();g();/* keep2 */h();");
		expect(asked).toEqual([" drop ", " keep2 ", " keep "]);
		// A global pattern is tested only as each prints, its `lastIndex` moving.
		const pattern = /keep/g;
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-7"), { comments: pattern })
		).toBe("f();/* keep */g();");
		expect(pattern.lastIndex).toBe(0);
		expect(
			print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-7"), { comments: /keep/y })
		).toBe("f();g();");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-8"), {})).toBe("/*! a */ /*! b */");
		expect(print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-9"), { comments: "/keep/g" })).toBe(
			"/* keep */f();g();"
		);
		expect(() => print(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-alone-the-comments-it-10"), { nonsense: 1 })).toThrow(
			"`nonsense` is not a supported option"
		);
	});

	it("should keep the names a global pattern keeps, however often it is asked", () => {
		const pattern = /keep/g;
		const { code } = minifyOnePass(
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-the-names-a-global"),
			{ compress: {}, mangle: { keep_fnames: pattern }, keep_fnames: pattern, toplevel: true }
		);
		expect(code).toBe(
			"function keepMe(){}function keepToo(){}function e(){}g(keepMe,keepToo,e),g(keepMe,keepToo,e);"
		);
		expect(pattern.lastIndex).toBe(0);
	});

	it("should print a part a node prints as without the parentheses it took as that node's operand", () => {
		const source = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-kept-part-as-its-place-takes");
		const expected =
			"const s=(g(),h());g(),h(),g(),h(),a,b,f([a]=[1],({b:b}={b:2}),([c]=[1])),x=a?y=1:c,x=(a||f(),c),g``,(a,b)``,(x={}.y)(()=>{}),a=- -b;a in b,c;x=!a&&b in c,x=a<b&&c;if(!b&&c)f();a(),- -b;({a:g()}).b;({a:g()}).b.c();({m(){}}).m()?a():b();(function(){g()})()==x;x=function(){g()}()==x,a=c;function k(i){return i++**2}function n(){return 1..a}x=new[1,2],x=new function(){this.b=1},k(1),n(),x={k:a=1,[b=1]:1},x=a?c:(f(1)(2),c);if(x=a?c:(g()+1,c)){({}).a?b():c();y()}x=new F(1);";
		expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
			expected
		);
		// Placed without the parentheses, the parts still map where they came from.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const mapped =
			/** @type {{ code: string, map: { names: string[] } }} */ (
				new SourceProcessor().process(source, {
					mode: "minify",
					compress: {},
					mangle: false,
					source: "a.js"
				})
			);
		expect(mapped.code).toBe(expected);
		expect(mapped.map.names).toEqual(expect.arrayContaining(["g", "h", "y"]));
		for (const [input, output, options] of /** @type {[string, string, EXPECTED_OBJECT?][]} */ ([
			// Where the items before it go, what opens the statement keeps them.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as"), "x,({a:g()}.b);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-2"), "(function(){g()}()==x);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-3"), "x={k:()=>1,[(()=>1)]:1},y=[()=>1];"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-4"), "x=(a||(f(1)(2)),longName);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-5"), "!(g(),h());"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-6"), "g(),h();"],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-7"),
				"export function t(){return[new function(){return{b:9}},new F(g()),2]}",
				{ sourceType: "module" }
			],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-a-part-a-node-prints-as-8"), "{\nf();\n}", { mode: "beautify", compress: false }]
		])) {
			expect(
				minifyOnePass(input, { compress: {}, mangle: false, ...options }).code
			).toBe(output);
		}
	});

	it("should keep a comment before a value from breaking the line after `return` or `throw`", () => {
		const all = { compress: {}, mangle: true, format: { comments: "all" } };
		for (const [source, expected] of [
			// An `if` printing as `return t?a:b` takes its test's comments before `return`.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value"),
				"function h(e){//c\nreturn e?1:2}console.log(h(0),h(1));"
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-2"),
				"function h(c){\n/*c\n*/\nreturn c.x?c:2}console.log(h({x:1}).x,h({}));"
			],
			// A `new` printing as a call opens with its callee, whose comments go first.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-3"), '//c\nthrow Error("x");'],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-4"),
				'function f(){//c\nreturn Error("x")}console.log(f().message);'
			]
		]) {
			const { code } = minifyOnePass(source, all);
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// A license comment is kept by default, so it breaks the line alike.
		const source =
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-keep-a-comment-before-a-value-5");
		expect(
			runProgram(minifyOnePass(source, { compress: {}, mangle: true }).code)
		).toBe("2 1");
	});

	it("should print as `quote_keys`, `inline_script`, `inlinesNames` and import phases ask", () => {
		for (const [source, options, expected] of /** @type {[string, EXPECTED_OBJECT, string][]} */ ([
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline"), { format: { quote_keys: true } }, 'var o={"a":1};console.log(o.a);'],
			// A shorter exponent moves the fraction's digits before it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-2"), {}, "console.log(15e-8,2.25e30);"],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-3"),
				{ module: true },
				'import defer*as o from"./x.js";console.log(o);'
			],
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-4"),
				{ module: true },
				'console.log(import.defer("./x"),import.source("./y"));'
			],
			// A directive spelled with escapes stays as written.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-5"), { format: { inline_script: false } }, "'\\x75se strict';console.log(1);"],
			// An escaped `\\<` gives its backslash up to the `\\x3c` replacing it.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-6"), {}, "'\\x3c!--';console.log(1);"],
			// A reserved list may be a set, as terser reads it; anything else reserves nothing.
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-7"), { mangle: { reserved: new Set(["a"]) } }, "function f(f){return f}f(1);"],
			[fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-7"), { mangle: { reserved: "a" } }, "function f(a){return a}f(1);"],
			// Names printed in their parents' text, as a walk that skips them asks.
			[
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-8"),
				{ compress: undefined, mangle: undefined, inlinesNames: true },
				"var a=b,c=d.e;f(a,g,new h);i`x`;"
			]
		])) {
			expect(
				minifyOnePass(source, { compress: {}, mangle: true, ...options }).code
			).toBe(expected);
		}
		// Each name printed so is mapped, as its parent prints it.
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const inlinesNames = /** @type {EXPECTED_OBJECT} */ ({ inlinesNames: true });
		const mapped = /** @type {{ code: string, map: EXPECTED_ANY }} */ (
			new SourceProcessor().process(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-print-as-quote-keys-inline-9"), {
				mode: "minify",
				...inlinesNames,
				source: "in.js"
			})
		);
		expect(mapped.map).toEqual(expect.objectContaining({ names: ["a", "b"] }));
	});

	describe("mangling properties in one pass", () => {
		const PROPERTY_SOURCES = [
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-2"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-3"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-4"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-5"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-6"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-7"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-8"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-9"),
			fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-10")
		];
		/** @type {{ keep_quoted?: boolean | "strict", reserved?: string[], regex?: RegExp | string, debug?: boolean | string, undeclared?: boolean, only_annotated?: boolean }[]} */
		const PROPERTY_OPTIONS = [
			{},
			{ keep_quoted: true },
			{ keep_quoted: "strict" },
			{ reserved: ["zAlpha", "zValue"] },
			{ regex: /^_/ },
			{ regex: "^(zAlpha|zLit|zValue)$" },
			{ debug: true },
			{ debug: "S" },
			{ undeclared: true },
			{ only_annotated: true },
			{ only_annotated: true, regex: /^zU/ }
		];

		it("should rename properties and run alike", () => {
			for (const source of PROPERTY_SOURCES) {
				for (const given of PROPERTY_OPTIONS) {
					const { code } = minifyOnePass(source, {
						compress: {},
						mangle: { properties: { ...given, cache: { props: new Map() } } }
					});
					// Strictly, a name read quoted and bare is the source's to keep
					// apart, which these do not.
					if (given.keep_quoted !== "strict") {
						expect(runProgram(code)).toBe(runProgram(source));
					}
				}
			}
		});

		it("should keep a computed key kept quoted together with its reads", () => {
			const { code } = minifyOnePass(
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-14"),
				{ compress: {}, mangle: { properties: { keep_quoted: true } } }
			);
			expect(code).toContain('["zKept"]()');
			expect(code).toContain("a.zKept()");
			expect(code).not.toContain("zRenamed");
			expect(runProgram(code)).toBe("1 2");
		});

		it("should read and write the property names a name cache holds", () => {
			const nameCache = { props: { props: { $zFooBar: "x" } } };
			const codes = [
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-15"),
				fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-16")
			].map(
				(source) =>
					minifyOnePass(source, {
						nameCache,
						compress: {},
						mangle: { cache: null, properties: {} }
					}).code
			);
			expect(codes[0]).toContain("{x:1,");
			expect(nameCache).toEqual({
				props: { props: { $zFooBar: "x", $zBazQux: "o", $zOther: "p" } }
			});
			expect(codes.map(runProgram)).toEqual(["1 2", "3 4"]);
		});

		it("should rename a property the cache hands another, and keep to the cache where asked", () => {
			const source = fixture("javascript", "javascript-minifier-printing-a-syntax-tree-mangling-properties-in-one-pass-17");
			for (const [options, expected] of /** @type {[EXPECTED_OBJECT, string][]} */ ([
				// The name the cache hands `zFoo` is renamed where the source has it.
				[
					{ mangle: { properties: {} }, nameCache: { props: { props: { $zFoo: "zQux" } } } },
					"var o={zQux:1,o:2};console.log(o.zQux,o.o);"
				],
				[
					{ mangle: { properties: { only_cache: true } }, nameCache: { props: { props: { $zFoo: "q" } } } },
					"var o={q:1,zQux:2};console.log(o.q,o.zQux);"
				],
				// A debug name taken already is no debug name.
				[
					{ mangle: { properties: { debug: true, reserved: ["_$zFoo$_"] } } },
					"var o={o:1,_$zQux$_:2};console.log(o.o,o._$zQux$_);"
				],
				// What the cache holds under a key not written as its own is not read.
				[
					{ mangle: { properties: {} }, nameCache: { props: { props: { zFoo: "x" } } } },
					"var o={o:1,l:2};console.log(o.o,o.l);"
				],
				[
					{ mangle: { properties: true }, nameCache: { vars: {} } },
					"var o={o:1,l:2};console.log(o.o,o.l);"
				]
			])) {
				const { code } = minifyOnePass(source, { compress: {}, ...options });
				expect(code).toBe(expected);
				expect(runProgram(code)).toBe("1 2");
			}
		});
	});
});

describe("JavaScript SourceProcessor printing", () => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");

	it("should print the whole source while visitors skip and stop", () => {
		/** @type {string[]} */
		const seen = [];
		const result = new SourceProcessor()
			.use({
				[NodeType.FunctionDeclaration]: {
					enter: (path) => {
						seen.push(`function ${path.name(path.field(0, Field.id))}`);
						path.skipChildren();
					}
				},
				[NodeType.Identifier]: (path) => {
					seen.push(path.name());
					if (path.name() === "stop") path.stop();
				}
			})
			.process(
				fixture("javascript", "javascript-source-processor-printing-should-print-the-whole-source-while"),
				{ mode: "minify" }
			);
		expect(seen).toEqual(["function f", "g", "f", "stop"]);
		expect(result).toEqual({
			code: "function f(a){return a+1}g(f);stop();function h(){b}",
			map: undefined
		});
	});

	it("should refuse a walk a visitor starts while another runs", () => {
		const {
			parsedTree,
			walkSyntaxTree
		} = require("../../../lib/javascript/syntax-parser");
		expect(() =>
			new SourceProcessor()
				.use({
					[NodeType.CallExpression]: (path) => {
						walkSyntaxTree(
							/** @type {import("../../../lib/javascript/syntax-parser").SyntaxTree} */ (
								parsedTree()
							),
							path.node,
							"f()",
							[],
							undefined
						);
					}
				})
				.process(fixture("javascript", "javascript-source-processor-printing-should-refuse-a-walk-a-visitor-starts"), {})
		).toThrow("process() is already running");
	});

	it("should print one source after another, and a source anew after a parse error", () => {
		const processor = new SourceProcessor();
		expect(processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and"), { mode: "minify" }).code).toBe(
			"a(1);"
		);
		expect(() => processor.process("a(", { mode: "minify" })).toThrow(
			/Unexpected token/
		);
		expect(
			processor.process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and-2"), { mode: "minify" }).code
		).toBe("let x=[1,2];");
	});

	it("should map each node's output to the source's", () => {
		const result = new SourceProcessor().process(fixture("javascript", "javascript-source-processor-printing-should-print-one-source-after-another-and"), {
			mode: "minify",
			source: "in.js"
		});
		expect(result.code).toBe("a(1);");
		// `a` at 0:0, named, and `1` from column 4 to column 2.
		expect(result.map).toEqual(
			expect.objectContaining({
				sources: ["in.js"],
				names: ["a"],
				mappings: "AAAAA,EAAI"
			})
		);		// A name read twice is given once.
		expect(
			new SourceProcessor().process(fixture("javascript", "javascript-source-processor-printing-should-map-each-node-s-output-to-the"), {
				mode: "minify",
				source: "in.js"
			}).map
		).toEqual(
			expect.objectContaining({
				names: ["a", "b"],
				mappings: "AAAAA,EAAIA,EAAGC"
			})
		);
	});
});

describe("JavaScript minifier mangling a SyntaxTree", () => {
	it("should read its own tree after a name counter starts another parse", () => {
		const { parseProgram } = require("../../../lib/javascript/syntax").parser;
		const letters = "abcdefghij";
		let resets = 0;
		const { code } = minifyOnePass(
			"class K { #first = 1; #second = 2; get() { return this.#first + this.#second; } } console.log(new K().get());",
			{
				sourceType: "script",
				mangle: {
					nthIdentifier: {
						get: (n) => letters[n],
						reset: () => {
							resets++;
							parseProgram("var other = 1;", 0, {});
						},
						consider: () => {},
						sort: () => {}
					}
				}
			}
		);
		expect(resets).toBe(1);
		expect(code).toBe(
			"class K{#a=1;#b=2;get(){return this.#a+this.#b}}console.log((new K).get());"
		);
	});

	it("should name every private name after a name source starts another parse", () => {
		const { isWalkingSyntaxTree } = require("../../../lib/javascript/syntax-parser");
		const { parseProgram } = require("../../../lib/javascript/syntax").parser;
		const letters = "abcdefghij";
		const { code } = minifyOnePass(
			"class K { #first = 1; #second = 2; get() { return this.#first + this.#second; } } console.log(new K().get());",
			{
				sourceType: "script",
				mangle: {
					nthIdentifier: {
						get: (n) => {
							if (!isWalkingSyntaxTree()) {
								parseProgram("var other = 1;", 0, {});
							}
							return letters[n];
						}
					}
				}
			}
		);
		expect(code).toBe(
			"class K{#a=1;#b=2;get(){return this.#a+this.#b}}console.log((new K).get());"
		);
	});

	it("should keep a sloppy block's function in its block where a lexical name would clash, in the one pass", () => {
		const source = [
			"function t1(){ let f = 1; { function f() { return 2 } } return typeof f }",
			"function t2(){ { let f = 1; { function f(){} } return typeof f } }",
			"function t3(x){ switch (x) { case 1: let g = 1; { function g(){} } return typeof g } }",
			"function t4(){ for (let h of [1]) { { function h(){} } return typeof h } }",
			"function t5(){ for (let i = 0; i < 1; i++) { { function i(){} } return typeof i } }",
			"function t6(){ for (const j in {a: 1}) { { function j(){} } return typeof j } }",
			"function t7(){ try { throw { a: [1, 2] } } catch ({ a: [b = 1, ...c], d: e }) { { function c(){} } return typeof c } }",
			"function t8(){ try { throw 1 } catch (e) { let k = 1; { function k(){} } return typeof k } }",
			"function t9(p) { { function p(){} } return typeof p }",
			"function t10({ q }) { { function q(){} } return typeof q }",
			"function t11() { { function s(){} } return typeof s }",
			"function t12() { class u {} { function u(){} } return typeof u }",
			"function t13([v = 1]) { { function v(){} } return typeof v }",
			"function t14(...w) { { function w(){} } return typeof w }",
			"function t15(){ for (;;) { { function z(){} } return typeof z } }",
			"function t16(x){ switch (x) { case 1: let o; break; case 2: { function g2(){} } return typeof g2 } }",
			"function t17(){ for (var k in {a: 1}) { { function k2(){} } return typeof k2 } }",
			"function t18(){ try { throw 1 } catch (e) { { function e2(){} } return typeof e2 } }",
			"function t19(){ try { throw 1 } catch (e) { var e = 2; return e } }",
			"function t20(){ try { throw [1, 2] } catch ([, h]) { { function h(){} } return typeof h } }",
			"function t21(){ try { throw {} } catch ({ ...r }) { { function r(){} } return typeof r } }",
			"function t22(){ var o = {a: 1}, p = {b: 2}, a = 0, b = 0; with (o) { with (p) { return a + b } } }",
			"console.log(t1(), t2(), t3(1), t4(), t5(), t6(), t7(), t8(), t9(1), t10({}), t11(), t12(), t13([]), t14(), t15(), t16(2), t17(), t18(), t19(), t20(), t21(), t22());"
		].join("\n");
		expect(runProgram(source)).toBe(
			"number number number number number string object number number undefined function function number object function function function function 2 number object 3"
		);
		for (const options of [
			{ compress: {}, mangle: true },
			{ compress: false, mangle: true },
			{ compress: {}, mangle: false }
		]) {
			expect(runProgram(minifyOnePass(source, options).code)).toBe(
				runProgram(source)
			);
		}
	});

	it("should run as the source runs under ie8 or safari10 in the one pass", async () => {
		const sources = [
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-2"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-3"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-4"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-5"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-6"),
			// Moved into the catch, the arrow would read the catch's `e`.
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-7"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-8"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-9"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-10"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-run-as-the-source-runs-under-11")
		];
		/**
		 * @param {string} code a script setting `result`
		 * @returns {Promise<unknown>} what it sets `result` to, awaited
		 */
		const run = async (code) => {
			/** @type {{ result: unknown, Promise: PromiseConstructor }} */
			const context = { result: undefined, Promise };
			vm.runInNewContext(code, context);
			return await context.result;
		};
		for (const options of [
			{ ie8: true },
			{ safari10: true },
			{ mangle: { ie8: true, safari10: true } }
		]) {
			for (const source of sources) {
				const expected = await run(source);
				const printed = minifyOnePass(source, {
					compress: {},
					mangle: {},
					...options
				});
				expect(await run(printed.code)).toEqual(expected);
			}
		}
	});

	it("should not read an outer name where a catch parameter of its name shadows it, in the one pass", () => {
		const sources = [
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-2"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-3"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-4"),
			fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-not-read-an-outer-name-where-5")
		];
		for (const source of sources) {
			/** @type {{ result?: unknown }} */
			const expected = {};
			vm.runInNewContext(source, expected);
			for (const mangle of [{}, false]) {
				/** @type {{ result?: unknown }} */
				const context = {};
				vm.runInNewContext(
					minifyOnePass(source, { compress: {}, mangle }).code,
					context
				);
				expect(context.result).toBe(expected.result);
			}
		}
	});

	it("should refuse a node its scope analysis cannot read", () => {
		const tree = new SyntaxTree();
		const program = tree.addEstree(
			/** @type {EXPECTED_ANY} */ (WebpackParser.parse("a;", {}))
		);
		const types = Uint8Array.from(tree._types);
		types[tree.field(0, Field.body, program)] = 255;
		readParsedTree(tree, "a;");
		expect(() =>
			analyzeMinifierTree(program, types, {}, () => {
				throw new Error("unreachable");
			})
		).toThrow("The minifier's scope analysis cannot read a node of type 255");
	});

	it("should read a `with`, a loop and a catch where no option asks for more", () => {
		const tree = new SyntaxTree();
		const source = fixture("javascript", "javascript-minifier-mangling-a-syntax-tree-should-read-a-with-a-loop-and-a");
		const program = tree.addEstree(
			/** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(source, { ecmaVersion: "latest" })
			)
		);
		readParsedTree(tree, source);
		const analysis = analyzeMinifierTree(
			program,
			Uint8Array.from(tree._types),
			{},
			() => {
				throw new Error("unreachable");
			}
		);
		expect(analysis.aliases).toBeNull();
		expect(analysis.spelledNames).toBeNull();
		expect([...analysis.globals.keys()]).toEqual(["o", "a"]);
	});
});

const jsMinify = require("../../../lib/javascript/jsMinify");

/** @typedef {import("../../../lib/javascript/jsMinify")} JsMinify */

const SCRIPT = fixture("javascript", "js-minify-should-minify-defaults");

const INPUT_MAP = {
	version: 3,
	sources: ["input.js"],
	names: [],
	mappings: ""
};

/**
 * The comment-selection shapes only a function states, paired with the source
 * and production each is exercised against.
 * @type {[string, { [file: string]: string }, import("terser").MinifyOptions & { as?: "script" | "module" | "event-handler" }, EXPECTED_ANY][]}
 */
const MINIFY_CASES = [
	[
		"keep and extract by predicate",
		{ "script.js": SCRIPT },
		{ format: { comments: (_node, comment) => /kept/.test(comment.value) } },
		(/** @type {EXPECTED_ANY} */ _node, /** @type {EXPECTED_ANY} */ comment) =>
			/license/i.test(comment.value)
	]
];

describe("jsMinify", () => {
	it("takes the minimizer options as optional", async () => {
		const { code } = await jsMinify({ "a.js": "var a = 1;" }, undefined);
		expect(code).toBe("var a=1;");
	});

	for (const [name, input, options, extractComments] of MINIFY_CASES) {
		for (const withMap of [false, true]) {
			const label = withMap ? `${name} (with source map)` : name;

			it(`should minify: ${label}`, async () => {
				const result = await jsMinify(
					input,
					withMap ? INPUT_MAP : undefined,
					{ ...options },
					extractComments
				);

				expect(result.code).toMatchSnapshot();
				expect(result.extractedComments).toMatchSnapshot();
				// It reads back as the production it was printed for.
				expect(() =>
					acorn.parse(result.code, {
						ecmaVersion: "latest",
						sourceType:
							options.as === "module" || options.module ? "module" : "script",
						allowReturnOutsideFunction: options.as === "event-handler"
					})
				).not.toThrow();
				// A handler body is read as the function body it is, so it maps.
				expect(typeof result.map).toBe(withMap ? "object" : "undefined");
			});
		}
	}

	it("should cache the names it hands out across assets", async () => {
		const nameCache = {};
		const result = await jsMinify(
			{ "cached.js": "var longName = 1; sink(longName);" },
			INPUT_MAP,
			{ toplevel: true, nameCache },
			false
		);
		expect(result.code).toBe("sink(1);");
		expect(typeof result.map).toBe("object");
		expect(nameCache).toEqual({ vars: { props: {} } });
		const shared = {};
		const options = { compress: false, toplevel: true, nameCache: shared };
		const first = await jsMinify(
			{ "first.js": 'var shared = "cached"; sink(shared);' },
			undefined,
			{ ...options },
			false
		);
		const second = await jsMinify(
			{ "second.js": "sink(shared);" },
			undefined,
			{ ...options },
			false
		);
		expect([first.code, second.code]).toEqual([
			'var a="cached";sink(a);',
			"sink(a);"
		]);
		expect(shared).toEqual({ vars: { props: { $shared: "a" } } });
	});

	it("should defer invalid comment patterns until a comment is tested", async () => {
		// Exercise a malformed runtime pattern outside the published type union.
		const invalidPattern = /** @type {EXPECTED_ANY} */ ("[");
		const options = { format: { comments: invalidPattern } };
		const input = { "plain.js": "run();" };
		expect(
			await jsMinify(input, undefined, options, { condition: invalidPattern })
		).toEqual(
			await jsMinify(input, undefined, { format: { comments: false } }, false)
		);
		const commented = { "commented.js": "/* comment */ run();" };
		await expect(
			jsMinify(commented, undefined, options, false)
		).rejects.toThrow(SyntaxError);
		await expect(
			jsMinify(commented, undefined, {}, { condition: invalidPattern })
		).rejects.toThrow(SyntaxError);
	});

	it("should claim JavaScript assets only", () => {
		expect(jsMinify.filter("app.js")).toBe(true);
		expect(jsMinify.filter("app.mjs?v=1")).toBe(true);
		expect(jsMinify.filter("app.cjs")).toBe(true);
		expect(jsMinify.filter("styles.css")).toBe(false);
		expect(jsMinify.getTypes()).toEqual(["javascript"]);
		expect(jsMinify.supportsWorkerThreads()).toBe(true);
	});

	it("should report webpack's version, so a cache entry follows it", () => {
		// The printer ships inside webpack, so webpack's own version is what an
		// upgrade of it moves.
		expect(jsMinify.getMinimizerVersion()).toBe(
			require("../../../package.json").version
		);
	});
});

describe("one-pass minify of what runs nothing", () => {
	it("should drop a call that runs nothing and fold a test it leaves known", () => {
		const cases = [
			// What runs something stays.
			[fixture("javascript", "one-pass-minify-of-what-runs-nothing-should-drop-a-call-that-runs-nothing-and-6"), "function f(n){return g(),c}"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: { toplevel: false }
				}).code
			).toBe(expected);
		}
	});
});

describe("one-pass minify of dead code", () => {
	it("should drop what never runs", () => {
		const cases = [
			// A `try` whose block runs nothing throws nothing for its `catch`.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs"), ""],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-2"), ""],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-3"), "function f(){foo()}"],
			// A `var` the `catch` declares is declared still, but not one its parameter names, nor a function.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-4"), "var foo;baz();"],
			// A `var` naming a parameter of a `catch` inside sets that, so its `try` and the dead `if` stay.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-32"), "var e=1;try{}catch(e){try{}catch(e){var e=\"e\"}}function f(){if(0)try{x()}catch(e){var e=\"e\"}return typeof e}"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-30"), "function f(){var a;g();return a}function h(){try{}catch(e){var e=1}return e}function i(){try{}catch({e:e}){var b}return b}function j(){try{}catch(e){var c}return c}"],
			// A `break` naming the loop's own label leaves it at once.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-5"), "x();"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-6"), "a(),b();"],
			// What follows a `return` never runs.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-7"), ""],
			// A value kept for what it runs drops what runs nothing.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-8"), "function f(){}"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-9"), "function f(){x()}"],
			// A case whose statements run nothing prints as an empty one.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-10"), "if(id(1)===1)console.log(\"PASS\");"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-11"), "id(123),console.log(\"PASS\");"],
			// What follows a case's `break` never runs.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-12"), "switch(foo){case\"bar\":break;default:other()}"],
			// A block listing nothing runs nothing.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-13"), "a();"],
			// A case's `var` or loop is the body of the `if` it prints as, an `else` after a loop keeping braces.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-14"), "if(a===1)var c=2;"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-15"), "if(a===3)while(x)if(y)z();"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-16"), "if(a===3){for(b of c)y()}else z();"],
			// An exit giving what the one after it gives runs its test, then that one; after a `:` the comma would end the `?:`.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-17"), "function f(){return x(),a}"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-18"), "function f(){throw x,a}"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-19"), "function f(){return p?q:x()?a:a}"],
			// A test running nothing goes, the exit after it printing whole.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-31"), "function f(n){return 2}function g(n){throw a}"],
			// A loop's `if` leaving the pass after an expression, an expression after it, prints as `?:`; ending a function it stays.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-20"), "for(;;)a()?b():c();"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-21"), "for(x in y)(a=1)?b=2:(c=3,d());"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-22"), "function f(){if(a())b();else c()}"],
			// A `for` whose test is known false runs its start alone, but a `let` keeps its scope.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-23"), "var se=[1,2];"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-24"), "function f(){var i=g(),j=1;for(let k=g();0;);return j}"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-25"), "a();"],
			// A branch of `?:` takes what prints as a sequence in parentheses.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-26"), "t?-(a(),b):c(),t?(a(),b()):c(),t?(x(),b()):c(),t?!a()||!b():c();for(;;)t()?(a(),b()):c();"],
			// A comma in a string, a template, a regular expression or a comment is none.
			// A loop leaving at once runs its `var` start alone, its `let` only the loop reads going, where its test runs nothing, but not an `in`.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-28"), "for(var x=0;x<3;x++)var y=0;for(var i=0;f();i++)break;for(var k=(a in b);0;);"],
			// A run of `if`s leaving alike, ending its function or loop, runs its tests alone.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-29"), "function f(){a||b}function g(){x();a||b||(c=1)}function h(){b}for(;;){x();a||b}"],
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-27"),"t?f(\"a',\\\"(\",c):d(),t?f(`x`,c):d(),t?f():d();"],
			// A branch keeps them only where a comma outside them separates values.
			[fixture("javascript", "one-pass-minify-of-dead-code-should-drop-what-never-runs-33"), "t?f(function(){a(),b(/[(]/)}):d(),t?f(a/b,c,\"(\"):d(),t?f(x.return/2,c):d(),t?(a(`(`),b(/,/)):d(),t?f(function(o){for(let k of o)/[(]/.test(k);return/[(]/.test(o++/2)},...o):d();"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, { compress: {}, mangle: false }).code
			).toBe(expected);
		}
	});
});

describe("one-pass minify of unread values", () => {
	/**
	 * @param {[string, string][]} cases each source and what it prints as
	 */
	const expectPrints = (cases) => {
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, { compress: {}, mangle: false }).code).toBe(
				expected
			);
		}
	};

	it("should drop a read a `typeof` test shows bound", () => {
		expectPrints([
			[fixture("javascript", "one-pass-minify-of-unread-values-should-drop-a-read-a-typeof-test-shows-bound-19"), ""]
		]);
	});

	it("should drop a conversion of an array or object literal that runs only built-ins", () => {
		expectPrints([
			[fixture("javascript", "one-pass-minify-of-unread-values-should-drop-a-conversion-of-an-array-or-object-3"), "+{toString(){}};"]
		]);
	});

	it("should drop built-in calls and reads that run nothing", () => {
		expectPrints([
			// A regular expression the built-in copies reads its native accessors.
			[fixture("javascript", "one-pass-minify-of-unread-values-should-drop-built-in-calls-and-reads-that-run-8"), ""],
			// `null` is a prototype `create` takes.
			[fixture("javascript", "one-pass-minify-of-unread-values-should-drop-built-in-calls-and-reads-that-run-14"), ""]
		]);
	});
});

describe("one-pass minify of statement sequences", () => {
	it("should join expression statements and the `return` after them, as terser's `sequences`", () => {
		const cases = [
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the"), "function f(a){a(),b(),c(),d(1)}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-2"), "function f(){return a(),b}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-3"), "function f(c){return c?a():b(),d}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-4"), "function f(){return a(),b(),c?1:2}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-5"), "function f(n){if(!n)return a(),1}"],
			// A `return` no space follows takes none it would need.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-6"), fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-6")],
			// A call of a function expression needs no `!` past the first.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-7"), "function f(){k();var n=g();h(n,n)}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-8"), "function f(){var n=g();h(n,n);return k}"],
			// An arrow joins whole only where it prints as what it returns.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-9"), "f(()=>(s?a():b(),x));"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-10"), "f(()=>{a();return t?1:2});"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-11"), "f(()=>{if(q)y();return a(),b});"],
			// One taking parentheses at a statement's start only goes bare in the sequence.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-12"), "function f(){return a(),function(){}.call(1),b}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-14"), "function f(){return a(),function(){}().x(),b}"],
			// asm.js reads its statements as written.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-expression-statements-and-the-13"), 'function f(){"use asm";return function(n){n=n|0;b=b|0;return n|0}}']
		];
		for (const [source, expected] of cases) {
			for (const map of [undefined, { source: "a.js" }]) {
				// A source map asked for changes nothing the minify prints.
				expect(
					minifyOnePass(source, {
						compress: { toplevel: false },
						mangle: { toplevel: false },
						...map
					}).code
				).toBe(expected);
			}
		}
	});

	it("should fold a `switch` past the loops and functions its `break`s skip, and spreads of literals", () => {
		const cases = [
			// A string it runs goes, never reading as a directive where the `switch` was.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-past-the-loops-and-8"), "function f(){return this}"]
		];
		for (const [source, expected] of cases) {
			expect(
				minifyOnePass(source, {
					compress: { toplevel: false },
					mangle: { toplevel: false }
				}).code
			).toBe(expected);
		}
	});

	it("should run what a converging `switch` tests in parentheses", () => {
		for (const [source, expected] of [
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-run-what-a-converging-switch-tests"), "x(),y();"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-run-what-a-converging-switch-tests-2"), "x(),a,y();"]
		]) {
			const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
			expect(code).toBe(expected);
			expect(runProgram(`var a=1;function x(){console.log(1)}function y(){console.log(2)}${code}`)).toBe("1\n2");
		}
	});

	it("should fold a labeled `switch` of a known value", () => {
		const cases = [
			[
				fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known"),
				"function s(a,c){a:{a();for(;;)if(c())break a;c();a();c()}}"
			],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known-2"), "function s(c,s){c(),s()}"],
			// A label needs a statement, and an unlabeled `break` its `switch`.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known-3"), "function s(c){c:switch(1){case 2:c()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-labeled-switch-of-a-known-4"), "function s(i,a){i:switch(1){case 1:i();if(a())break;if(i())break i;a()}}"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			});
			expect(code).toBe(expected);
			// `y` alternates, so a loop waiting on it ends.
			for (const call of [
				"var n=0;s(()=>console.log(1),()=>{console.log(2);return n^=1})",
				"var n=1;s(()=>console.log(1),()=>{console.log(2);return n^=1})"
			]) {
				expect(runProgram(`${code}${call}`)).toBe(runProgram(`${source}${call}`));
			}
		}
	});

	it("should fold a `switch` on a sequence known by its last, running the rest first", () => {
		const cases = [
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known"), "function s(c,s,a){c(),a(),s()}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-2"), "function s(a,c,e){a(),c(),e()}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-3"), "function s(c,s,w){c(),w(),s()}"],
			// A comment on what it tests prints with it.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-4"), "function s(c,s,w){/*! c */c(),42,w()}"],
			// What it runs first joins only expressions, before a match it ran
			// a case's test, and running nothing else it stays.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-5"), "function s(c,i,s){switch(c(),42){case 42:if(i)s()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-6"), "function s(c,s,w){switch(c(),42){case s():w()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-7"), "function s(c,s){switch(c(),42){case 13:s()}}"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-switch-on-a-sequence-known-8"), "function s(c,s){switch(c(),s()){case 13:s()}}"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			});
			expect(code).toBe(expected);
			const call =
				"s(()=>console.log(1),()=>{console.log(2);return 13},()=>{console.log(3);return 42})";
			expect(runProgram(`${code}${call}`)).toBe(runProgram(`${source}${call}`));
		}
	});

	it("should print the global `undefined` read as an object, callee or tag as `(void 0)`", () => {
		// One a scope declares, or `delete` reads, stays.
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-the-global-undefined-read-as");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"try{x=(void 0).a}catch(e){console.log(e.name)}try{(void 0)[0]}catch(e){console.log(e.name)}try{(void 0)()}catch(e){console.log(e.name)}try{new(void 0)}catch(e){console.log(e.name)}try{(void 0)`t`}catch(e){console.log(e.name)}console.log(!1),console.log({a:1}.a);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a binary expression folding to an infinity or `NaN` as `1/0`, `-1/0` or `NaN`", () => {
		// A division needs the parentheses its place gave the expression; `**` binds tighter. `NaN` prints as the global's name, `0/0` only where `with`, `eval` or a binding may take it.
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-binary-expression-folding");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'var a=2;console.log(1/0,2/0,1/0,-1/0,NaN,NaN,a/(2/0),a- -2/0,-(2/0),(2/0).toLocaleString(),2**2e3,a**(2/0),f()/0,a/(1/0),a- -1/0,-(1/0),(1/0).toLocaleString(),a**(1/0));'
		);
		expect(runProgram(`function f(){return 1}${code}`)).toBe(
			runProgram(`function f(){return 1}${source}`)
		);
		// Where a scope binds `NaN`, it prints as the division.
		const shadowed = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-binary-expression-folding-2");
		expect(
			minifyOnePass(shadowed, { compress: {}, mangle: false }).code
		).toBe('!function(NaN){eval(""),console.log(0/0,NaN)}(5);');
	});

	it("should fold a conditional whose test is an array, object or function made in place", () => {
		// A test running something keeps what it runs.
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-conditional-whose-test-is");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'function x(){return console.log("x"),7}console.log(1,3,4,x(),(x(),7),9);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should parenthesize a fold or element read keeping an infinity, which prints as a division", () => {
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-a-fold-or-element");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'console.log((1/0).toString(),(1/0).toFixed(),(-1/0).toString(),new(1/0),(1/0).x,[1/0][0].toFixed(),{a:1/0}.a.toFixed(),"number",0,1/0);'
		);
		expect(() => acorn.parse(code, { ecmaVersion: "latest" })).not.toThrow();
		expect(runProgram(`var a;${code}`)).toBe(runProgram(`var a;${source}`));
	});

	it("should read the length and constant elements of an array spreading array literals", () => {
		// A spread of anything else, an element running something, or one not constant stays.
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-read-the-length-and-constant");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'var a=[1];function y(){return 7}console.log(5,40,20,"s",void 0,[10,...a][1],[y(),2][1],y(),2);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print an `if` calling one local name in both branches as one call", () => {
		// A test running something or calls differing twice stay.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-an-if-calling-one-local-name");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'function f(d,c){d(c?1:2,"a"),d(c?1:2),g(c?1:2),h()?d(1):d(2),c?d(1,1):d(2,2)}function g(v){console.log("g",v)}function h(){return 0}f(function(v,w){console.log(v,w)},1);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print an `if` holding an `if` with a branch alike as one `?:` of joined tests", () => {
		// Branches unlike stay nested; an assignment test takes its parentheses.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-an-if-holding-an-if-with-a");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'var l=[];function t(v){return l.push(v),v}function f(a,b){t(a)&&t(b)?l.push("c"):l.push("d"),t(a)||t(b)?l.push("c"):l.push("d"),t(a)?t(b)?l.push("c"):l.push("d"):l.push("e"),t(a)&&t(b)?l.push("c"):l.push("d")}f(1,0),f(0,1),console.log(l.join());'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print two `new`s of one local name differing in one argument as one", () => {
		// A call and a `new`, or a member read off each, stay.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-two-new-s-of-one-local-name");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"function F(v){this.v=v}function f(c){return new F(c?1:2)}function g(c){c?new F(1).v:new F(2).v,new F(c?3:4)}function h(c){return c?new F(1):F(2)}console.log(f(1).v,g(0),typeof h(0));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should parenthesize the side a known left side leaves where it opens a statement with a function or object", () => {
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-the-side-a-known-left");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var x;(function(){console.log(1)}).call();({f(){console.log(2)}}).f();x=function(){return 4}.call(),console.log(x);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
		// An `if` printing its test as a statement wraps it whole.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-the-side-a-known-left-3"), { compress: {} }).code
		).toBe("(function(){console.log(3)}());");
		// A parenthesized one prints its own parentheses only.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-the-side-a-known-left-2"), { compress: {} }).code
		).toBe("(function(){}).call();({}).y();");
		// A left side kept for its truth, holding a comment, opens the statement.
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-statement-sequences-should-parenthesize-the-side-a-known-left-4"), { compress: {} }).code
		).toBe("(function(){/*!keep*/return 1});({a:/*!k*/1});");
	});

	it("should join a template's substitution reading the global `undefined` as its name", () => {
		// A local `undefined` is a name the fold may not read as the value.
		const source = "var a=`1${undefined}`;function f(undefined){return`2${undefined}`}console.log(a,f(1));";
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe('var a="1undefined";function f(undefined){return`2${undefined}`}console.log(a,f(1));');
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should open a statement with the branch a folded conditional keeps, unparenthesized", () => {
		// A member read off the kept branch stays unparenthesized too.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-open-a-statement-with-the-branch-a");
		const { code: code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("x.r();");
		expect(runProgram(code)).toBe(runProgram(source));
		const source2 = fixture("javascript", "one-pass-minify-of-statement-sequences-should-open-a-statement-with-the-branch-a-2");
		const { code: code2 } = minifyOnePass(source2, { compress: {}, mangle: false });
		expect(code2).toBe("x;");
		expect(runProgram(code2)).toBe(runProgram(source2));
	});

	it("should join a string literal with the one opening the `+` added to it", () => {
		// One opening with anything else, or two literals not strings, stay.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-join-a-string-literal-with-the-one");
		const { code: code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("var x=1,o={valueOf(){return 2}};console.log(\"ab\"+x,\"a\"+(\"b\"+x+\"c\"),\"ab\"+o,\"a\"+(x+\"b\"),\"a\"+(1+x),1+(\"b\"+x),\"ab\"+ +x);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should write a regexp a sequence in a template ends with as the template's text", () => {
		// A sequence running something first stays.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-write-a-regexp-a-sequence-in-a");
		const { code: code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("var n=0;console.log(\"2 /b/\",\"a/c/g\",`a${n++,/d/}`,n);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print `String` of a value that is a string already as that value", () => {
		// A place a `+` binds looser in, a local `String` or another argument keep the call.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-string-of-a-value-that-is-a");
		const { code: code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("var x=1,o={toString(){return\"t\"},valueOf(){return\"v\"}},a=x+\"str\",b=[\"str\"+o,`a${x}`,\"q\"];console.log(a,b,String(x+\"s\").length,String(x),String(o+\"!\",2),function(String){return String(x+\"s\")}(function(v){return\"f\"+v}));");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop a `|0` an operand of `>>>` takes where it converts no later than before", () => {
		// `>>>` converts both sides to integers itself, and throws on a BigInt either way; `>>` keeps it.
		// A bare read, or a redundant `+` another fold may print bare, could defer an object's conversion past the other operand's read, so only a side already guaranteed primitive goes.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-drop-a-0-an-operand-of-takes");
		const { code: code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("function f(v,s,o){return[1>>>s,v-0>>>s,(v++|0)>>>s,(~v|0)>>>s,v>>>1,(v|0)>>>s,(v|0)>>>s,(o.x|0)>>>s,v>>>(s|0),(v|0)>>s]}console.log(f(-1,0).join(),f(4.7,33).join(),f(\"8\",1,{x:2}).join());");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a `|0` beside `>>>` where its side may be a BigInt", () => {
		// `|` throws on a BigInt before `>>>` reads its count, `>>>` alone only after.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-drop-a-0-an-operand-of-takes-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("var n=0;function c(){return n++,1}function f(v,s){try{return[(~v|0)>>>c(),(-v|0)>>>c(),(v*v|0)>>>c(),(++v|0)>>>c(),(1n|0)>>>c()]}catch(e){return n}}function g(v,s){return[!v>>>s,typeof v>>>s,-1>>>s,-6>>>s]}console.log(f(1n),f(2),g(1,1).join());");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a template of one substitution as that value added to an empty string under `unsafe`", () => {
		// `+` converts the value by `valueOf` first, so only `unsafe` takes it; a place `+` binds looser in stays.
		const source = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-template-of-one");
		const { code: code } = minifyOnePass(source, { compress: { unsafe: true }, mangle: false });
		expect(code).toBe("var x=1,y=2,a=\"\"+x,b=[\"\"+x*y,`${x+y}`];console.log(a,b,`${x}`.length);");
		expect(runProgram(code)).toBe(runProgram(source));
		const source2 = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-template-of-one-2");
		const { code: code2 } = minifyOnePass(source2, { compress: {}, mangle: false });
		expect(code2).toBe("var x=1,a=`${x}`;console.log(a);");
		expect(runProgram(code2)).toBe(runProgram(source2));
		// A substitution that folds prints as the string it makes, shorter still.
		const source3 = fixture("javascript", "one-pass-minify-of-statement-sequences-should-print-a-template-of-one-3");
		const { code: code3 } = minifyOnePass(source3, { compress: { unsafe: true }, mangle: false });
		expect(code3).toBe("const a=1;function f(x){return[\"1\",\"b\",\"1\",\"\"+x]}console.log(f(2).join());");
		expect(runProgram(code3)).toBe(runProgram(source3));
	});

	it("should fold a `delete` of a conditional whose test is known and branch runs nothing", () => {
		// A branch reading a member or calling stays.
		const source =
			fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-delete-of-a-conditional");
		const { code } = minifyOnePass(source, { compress: {}, mangle: {} });
		expect(code).toBe(
			'var o={p:1};function y(){console.log("y")}console.log(!0,!0,!0,delete(0,o.p),o.p,delete y());'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a `delete` of the global `undefined`, `NaN` or `Infinity` to `false`", () => {
		const cases = [
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-delete-of-the-global"), "console.log(!1,!1,!1);"],
			// A parameter of the name, or a `with` that may hold one, is not the global.
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-delete-of-the-global-2"), "function f(e){return delete e}console.log(f());"],
			[fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-a-delete-of-the-global-3"), "var o={NaN:1};with(o)console.log(delete NaN);"]
		];
		for (const [source, expected] of cases) {
			const { code } = minifyOnePass(source, { compress: {} });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should fold an optional chain starting on `null` or `undefined` to `undefined`", () => {
		// Nothing past the start runs; a start that runs code, a parameter named `undefined`, a first link read plainly or a chain `**` or a member reads stays.
		for (const [source, expected] of [
			[
				fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-an-optional-chain-starting-on"),
				"var n=0;function f(){return n++,1}console.log(void 0,void 0,void 0,typeof void 0,void 0),console.log(n);"
			],
			[
				fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-an-optional-chain-starting-on-2"),
				"function f(n){return n?.a}var o={a:{b:1}};console.log(f({a:2}),(void console.log(3))?.a,null?.a**2,o?.a.b);"
			]
		]) {
			const { code } = minifyOnePass(source, {
				compress: { toplevel: false },
				mangle: { toplevel: false }
			});
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-an-optional-chain-starting-on-3"), {
				compress: { toplevel: false }
			}).code
		).toBe("x=(null?.a).b,y=null.a?.b;");
		expect(
			minifyOnePass(fixture("javascript", "one-pass-minify-of-statement-sequences-should-fold-an-optional-chain-starting-on-4"), { format: { comments: "all" } }).code
		).toBe("x=/* c */null?.a;");
	});

	it("should read `?.` after what is never nullish as `.`", () => {
		expect(
			minifyOnePass(
				fixture("javascript", "one-pass-minify-of-statement-sequences-should-read-after-what-is-never-nullish"),
				{ compress: { toplevel: false }, mangle: { toplevel: false } }
			).code
		).toBe(
			"function t(n){return[(n(),{}).b,[1].x,void 0,void 0,`a`.length,(1+a).b,(-a).b,(void a)?.b,function(){}(),(n(),a)?.b]}"
		);
	});
});

describe("one-pass minify options", () => {
	it("should read the options given without `compress` or `mangle`, compressing and mangling nothing", () => {
		const { SourceProcessor } = require("../../../lib/javascript/syntax");
		const print = (
			/** @type {string} */ source,
			/** @type {import("../../../lib/javascript/syntax-parser").JavascriptProcessOptions} */ options
		) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(source, { mode: "minify", ...options })
			).code;
		expect(print(fixture("javascript", "one-pass-minify-options-should-read-the-options-given-without-compress-or-mangle"), {})).toBe("var x=1;f(x);");
		expect(
			print(fixture("javascript", "one-pass-minify-options-should-read-the-options-given-without-compress-or-mangle"), { format: { comments: "some" } })
		).toBe("/*! a */var x=1;f(x);");
		expect(print(fixture("javascript", "one-pass-minify-options-should-read-the-options-given-without-compress-or-mangle-2"), { toplevel: true })).toBe(
			"var x=1;f(x);"
		);
		expect(print(fixture("javascript", "javascript-source-processor-printing-should-refuse-a-walk-a-visitor-starts"), { wrap: "W" })).toBe(
			'(function(exports){f()})(typeof W=="undefined"?W={}:W);'
		);
	});

	it("should read `output` as terser's older name for `format`, never beside it", () => {
		expect(
			minifyOnePass(fixture("javascript", "javascript-minifier-printing-a-syntax-tree-should-read-terser-s-snake-case-5"), { compress: {}, output: { ascii_only: true } })
				.code
		).toBe('g("\\xe9");');
		expect(() =>
			minifyOnePass(fixture("javascript", "parse-program-returns-the-program-s-node-read-through-a-until-the-next-parse-2"), { compress: {}, format: {}, output: {} })
		).toThrow("only one of them");
	});
});

describe("one-pass minify of side effects and dead code, second round", () => {
	it("should keep a `join` of constants where the program replaces `Array.prototype.join`", () => {
		const source = 'Array.prototype.join=function(){return"j"};console.log([1,2].join("-"))';
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe('Array.prototype.join=function(){return"j"},console.log([1,2].join("-"));');
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a `Number` constant where the program replaces `Number`", () => {
		for (const [source, pristineGlobals, expected] of /** @type {[string, boolean, string][]} */ ([
			["globalThis.Number={MIN_VALUE:1,NaN:2};console.log(Number.MIN_VALUE,Number.NaN)", true, "globalThis.Number={MIN_VALUE:1,NaN:2},console.log(Number.MIN_VALUE,Number.NaN);"],
			["var g=globalThis;g.Number={MIN_VALUE:1};console.log(Number.MIN_VALUE)", false, "var g=globalThis;g.Number={MIN_VALUE:1},console.log(Number.MIN_VALUE);"]
		])) {
			const { code } = minifyOnePass(source, { compress: { pristineGlobals }, mangle: false });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		expect(minifyOnePass("Number.x=1;console.log(Number.MIN_VALUE)", { compress: {}, mangle: false }).code).toBe("Number.x=1,console.log(5e-324);");
	});

	it("should keep a call of `RegExp`, `String` or `Object.keys` the program replaces", () => {
		const F = 'function(){console.log("r");return["z"]}';
		for (const [source, pristineGlobals, expected] of /** @type {[string, boolean, string][]} */ ([
			[`globalThis.RegExp=${F};RegExp("x");RegExp()`, true, `globalThis.RegExp=${F},RegExp("x"),RegExp();`],
			[`var g=globalThis;g.RegExp=${F};RegExp("x")`, false, `var g=globalThis;g.RegExp=${F},RegExp("x");`],
			['globalThis.String=function(v){return"S"+v};var x=1;console.log(String("a"+x))', true, 'globalThis.String=function(v){return"S"+v};var x=1;console.log(String("a"+x));'],
			[`globalThis.Object.keys=${F};console.log(Object.keys({a:1}))`, true, `globalThis.Object.keys=${F},console.log(Object.keys({a:1}));`]
		])) {
			const { code } = minifyOnePass(source, { compress: { pristineGlobals }, mangle: false });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should take no built-in as native under `pristineGlobals: false`", () => {
		// A write the default takes as native: an alias, a computed key, a script's `this`.
		const C = "class{constructor(p){this.p=p}}";
		for (const [source, expected] of [
			[`var g=globalThis;g.RegExp=${C};console.log(new RegExp("a"+g.x).p)`, `var g=globalThis;g.RegExp=${C},console.log(new RegExp("a"+g.x).p);`],
			[`var k="Error";globalThis[k]=${C};console.log(new Error("e").p)`, `var k="Error";globalThis[k]=${C},console.log(new Error("e").p);`],
			['this.isFinite=function(){return"f"};console.log(isFinite(1))', 'this.isFinite=function(){return"f"},console.log(isFinite(1));'],
			['Object.getPrototypeOf([]).join=function(){return"j"};console.log([1,2].join("-"))', 'Object.getPrototypeOf([]).join=function(){return"j"},console.log([1,2].join("-"));']
		]) {
			const { code } = minifyOnePass(source, { compress: { pristineGlobals: false }, mangle: false });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// The default takes them as native.
		expect(minifyOnePass('console.log(new Error("e").message,[1,2].join("-"),isFinite(1))', { compress: {}, mangle: false }).code).toBe('console.log(Error("e").message,"1-2",!0);');
	});

	it("should keep `new` of a built-in the program replaces through the global object", () => {
		// The replacement may be a class, which throws called without `new`.
		const source = fixture("javascript", "h-builtin-written-global-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe("globalThis.RegExp=class{constructor(p){this.p=p}},globalThis.Error=class{constructor(m){this.m=m}};function make(a,b){return[new RegExp(a+b).p,new RegExp(\"ab\").p,new Error(a).m]}console.log(make(\"x\",\"y\").join());");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop what only makes a value, run what is left, and declare what never runs", () => {
		const cases = [
			// Built-ins called on what they convert quietly make a value only.
			[fixture("javascript", "h-pure-builtins-1"), "a(),x();"],
			// What may throw or reads a replaced built-in stays.
			[fixture("javascript", "h-pure-builtins-2"), "Object.create(1),Object.create(10n),Float16Array.of(),Number.parseInt(`1`,10n),BigInt64Array.of(1),parseInt(`1`,10n),isNaN(10n),RegExp(/\\-/,`u`),RegExp(/a/g,`gg`),Math.random(...a),RegExp.prototype.flags=1,RegExp(/a/);"],
			// A pattern no regular expression makes the same without `new`.
			[fixture("javascript", "h-regexp-without-new-1"), "var r=RegExp(`abc${d}`,`g`),s=RegExp(`^`+t);f(r,s);"],
			// A known `switch` declares the `var` its dropped cases hold.
			[fixture("javascript", "h-switch-var-1"), "console.log(x);var x;if(z){g(y);var y}function h(){k()}var w;"],
			// A name read in its function past its declaration is set: the read runs nothing.
			[fixture("javascript", "h-settled-read-1"), "class S{}function f(){let x=g();h(x)}function k(){y;let y=1}function m(a){switch(a){case 1:let z=g();break;case 2:z}}function n(){for(;;){w;let w=1}}"],
			// A `delete` of what is no reference is that value run, then `true`.
			[fixture("javascript", "h-delete-value-1"), "var a;f((a=1,!0)),x=(a=2,!0)+1,y=[(0,b,!0)];function g(){return a=3,!0}z=delete a.b,w=(delete(a=4)).c;"],
			// Two `if`s leaving by the same label print as one testing either.
			[fixture("javascript", "h-labeled-exits-1"), "x:for(;;)for(;;){if(a||b)continue x;g()}y:for(;;)for(;;){if(c)break y;if(d)break;h()}"],
			// A block holding only a `break` leaves a known `switch` as the `break` does.
			[fixture("javascript", "h-switch-block-break-1"), "x();"],
			// The one value a sequence keeps prints bare where a `for` iterates it or a dot reads it.
			[fixture("javascript", "h-sequence-item-bare-1"), "for(var x of[3,4])f(x);for(let y in o)f(y);[].foo=2,a.b(),(1,{}).b=2,z=(0,a?.b).c;"],
			// An unread write of a reference prints its value, after `0,` where it is called.
			[
				fixture("javascript", "h-unread-reference-write-1"),
				"function a(){return(0,o.f)()}function b(){return(0,o?.f)``}function c(){return(0,eval)(x)}function d(){return g(o.f)+o.h}function e(){return f()}function h(){let t;return(t=o.f).g}function i(){let t;return typeof(t=x)}function j(){return o.f,!0}function k(){var t;return f(t=o.f),function(){return t}}"
			]
		];
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, { compress: { ecma: 2020 }, ecma: 2020, mangle: false }).code).toBe(expected);
		}
		// An `if` whose body is a `switch` testing what runs nothing, with no case, runs its test.
		expect(minifyOnePass(fixture("javascript", "h-if-empty-switch-1"), { compress: {}, mangle: false }).code).toBe("a;if(c)typeof d;else e();");
		// A constructor's `this` read past its `super()` runs nothing.
		expect(minifyOnePass(fixture("javascript", "h-this-after-super-1"), { compress: { ecma: 2020 }, ecma: 2020, mangle: false, module: true }).code).toBe(
			"export class A extends B{constructor(){super(),foo()}}export class C extends B{constructor(){super(),this.a=1}}export class D extends B{constructor(){this,super()}}export class E extends B{constructor(){if(x)super();this}}"
		);
	});
});

describe("one-pass minify of side effects and dead code, third round", () => {
	it("should print an `if` whose test's truth is known though it runs something as that test then the branch it picks", () => {
		// What declares a `var` or leaves keeps its branch; next to another `if`, one with no `else` stays.
		const source = fixture("javascript", "n-known-test-if-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'var log=[];function f(v){return log.push("f"+v),v}f(1),log.push("b"),f(2),log.push("c"),f(3),log.push("e");f(4);f(5),log.push("i"),f(6),log.push("j"),f(7)?log.push("m"):(f(8),log.push("o"));for(var i=0;i<2;i++)f(9);if(f(10),0)var kept=1;else log.push("r");function g(){if(!(f(11),0))log.push("s")}g(),f(12),log.push("t"),console.log(log.join(),kept);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop a case's `let` or `const` nothing names, and print what is left as an `if` or in place", () => {
		// A name another case reads in its dead zone keeps its declaration.
		const source = fixture("javascript", "n-switch-unread-let-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'var log=[];function f(v){return log.push(v),v}function a(x){if(x===1)f(1),f(2)}function b(x){switch(x){case 1:f(3);f(4);break;case 2:f(5)}}function c(x){switch(x){case 1:let z=6;f(z);break;case 2:try{f(z)}catch(e){f("tdz")}}}let w=1;f(8);a(1),b(1),b(2),c(1),c(2),console.log(log.join(),w);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop the exit ending the last case of a `switch` ending its holder, and print a case's block of one statement bare", () => {
		const source = fixture("javascript", "n-switch-tail-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){return log.push(v),v}function a(x){x}function b(x){switch(x){case 1:f(1);return;case 2:f(2)}}function c(x){if(x===1)f(3)}function d(x){for(var i=0;i<2;i++)if(x===1)f(4)}function e(x){if(x===3)for(var y of[5]){f(y);break}}a(1),b(1),b(2),c(1),d(1),e(3),console.log(log.join());"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print the cases after one a known `switch` surely matches without their labels, none running past a leaving statement", () => {
		const source = fixture("javascript", "n-switch-sure-match-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){return log.push(v),v+1}function a(foo){switch(1){case 1:f(\"x\");if(foo)break;f(\"y\")}}function b(){switch(2){case f(0):case f(1):f(2);case 2:f(5)}}function c(t){switch(1){case t():f(\"at\");case 1:f(\"one\");break;var q}return typeof q}a(0),a(1),b(),console.log(log.join(),c(function(){return 0}));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should brace a case's `switch` printing several statements as an `if`'s body", () => {
		const source = fixture("javascript", "n-folded-switch-in-case-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			'var log=[];function g(a){if(a===1){if(a===2)log.push("h");return}log.push("k")}function h(a){if(a===1){if(a!==2)log.push("d");return}log.push("e")}g(1),g(2),h(1),h(2),console.log(log.join());'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a known `switch`'s cases testing a constant it never is without their labels, and one case left as an `if`", () => {
		const source = fixture("javascript", "n-switch-sure-match-2");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){log.push(v)}function a(t){if(!0===t)f(1)}function b(t){switch(1){case t:f(4);break;default:f(6)}}function c(t){switch(1){case 2:var v=1;case t:f(v)}}a(!0),a(!1),b(1),b(2),c(1),console.log(log.join());"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should declare after what runs a `var` setting nothing that every case of a `switch` falls into", () => {
		const source = fixture("javascript", "n-converging-switch-var-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){return log.push(v),v}f(1);var b;f(2),f(3),f(4);var c;if(log.length){f(5),f(6);var d}if(log.length)switch(f(7)){default:var e}console.log(log.join(),b,c,d,e);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop a built-in call named by a string key, and `Date.parse` of a BigInt", () => {
		const source = fixture("javascript", "n-pure-builtin-spellings-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"x=[\"a\"],Object[k]({}),isNaN(10n);"
		);
	});

	it("should print without braces a body ending in an `if` printing its test alone, before an `else`", () => {
		const source = fixture("javascript", "n-test-only-if-else-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){return log.push(v),v}for(var i=0;i<2;i++)if(i)for(var j=0;j<1;j++)f(1);else f(3);if(log.length)f(4);else f(5);console.log(log.join());"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a known `switch` whose second case surely matches as `if`/`else`, and join an empty case testing what runs nothing into the last `default`", () => {
		const source = fixture("javascript", "n-switch-sure-else-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){log.push(v)}function a(t){if(1===t)f(\"t\");else f(\"one\")}function b(t){if(1===t)f(\"t\");f(\"one\")}function c(t,u){switch(!0){case u:f(\"u\");break;default:f(\"d\")}}function d(t,u){switch(u){case t:default:f(\"e\");break;case 1:f(\"1\")}}a(1),a(2),b(1),b(2),c(!0,!1),c(!1,!0),d(1,1),d(2,1),console.log(log.join());"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print as `export\u2026from` an import whose names not exported nothing reads", () => {
		const source = fixture("javascript", "n-reexport-unread-import-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false, module: true });
		expect(code).toBe(
			"export{bar}from\"somewhere\";export{f};export{a,a as e,c}from\"x\";import{f,g}from\"y\";g();"
		);
	});

	it("should keep the one name a `source` or `defer` import binds, which it cannot load without", () => {
		const source = fixture("javascript", "n-phased-unread-import-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false, module: true });
		expect(code).toBe(
			"import source a from\"a\";import defer*as b from\"b\";import\"c\";"
		);
	});

	it("should drop the `let` or `const` start of a loop leaving at once where its values run nothing, else run it in braces", () => {
		const source = fixture("javascript", "n-broken-loop-let-1");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"var log=[];function f(v){return log.push(v),v}const a=9;if(log.length);else f(1);{let c=f(2)}console.log(log.join(),a);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify spellings", () => {
	it("should spell every string as the program's strings are, a template where they are", () => {
		// A `typeof` compared to "undefined" and a template folding to a string take backticks too.
		for (const [source, expected] of [
			[
				fixture("javascript", "j-spellings-1"),
				"let s=`PASS`;if(typeof x>`u`)console.log(s);if(typeof y<`u`)console.log(y);"
			],
			[fixture("javascript", "j-spellings-2"), "console.log(`1 x`),console.log(`${String.raw`a`} y`);"],
			// After `yield` and `await`, keywords there, a template is no tagged one.
			[
				fixture("javascript", "j-spellings-10"),
				"function*g(){console.log(`a`),yield`b`}async function f(){console.log(await`c`)}console.log([...g()].join(``)),f();"
			]
		]) {
			const { code } = minifyOnePass(source, { compress: {}, ecma: 2020 });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});

	it("should join a call printing as its function's statements where they print as expressions only", () => {
		// An `if` the function prints keeps its own statement.
		const source = fixture("javascript", "j-spellings-3");
		const { code } = minifyOnePass(source, { compress: { toplevel: true } });
		expect(code).toBe(
			"console.log(1),console.log(2);if(console)console.log(3);console.log(4),console.log(5),console.log(6);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a function, class or object opening a statement bare where the statement joins a sequence", () => {
		// Parenthesized only to open its statement, it needs no parentheses after a comma, a function moved to its call too.
		for (const [source, expected] of [
			[
				fixture("javascript", "j-spellings-4"),
				'var a=1;a++,function(){console.log("f")}.call(this),console.log(a),{get x(){return console.log("g"),1}}.x,function(){console.log("h")}.call(this),console.log(2);'
			],
			[
				fixture("javascript", "j-spellings-5"),
				"function run(l){console.log(l.length),function(o){for(var n=0;n<l.length;n++)o(l[n])}(console.log)}run([1,2]),function(){console.log(3)}.call(this),console.log(4);"
			]
		]) {
			const { code } = minifyOnePass(source, { compress: {} });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
		// One printing alone keeps its parentheses and the statement after it apart.
		expect(minifyOnePass(fixture("javascript", "j-spellings-14"), { compress: {} }).code).toBe(
			"(function(){console.log(1)}).call(this);console.log(2);"
		);
	});

	it("should print an import only `export` lists read as `export…from`", () => {
		// Imports of one module join the first; one whose names something else reads stays.
		expect(minifyOnePass(fixture("javascript", "j-spellings-7"), { compress: {}, ecma: 2020, mangle: true, module: true }).code).toBe(
			'export{foo,foo2}from"foo";import"bar";import def,{used}from"lib";export*as namespace from"all";import{kept}from"kept";console.log(used,kept);export{def,kept};'
		);
		// Before ES2020 a namespace has no `export * as` to print as.
		expect(minifyOnePass(fixture("javascript", "j-spellings-7"), { compress: {}, ecma: 2015, mangle: true, module: true }).code).toBe(
			'export{foo,foo2}from"foo";import"bar";import def,{used}from"lib";import*as o from"all";import{kept}from"kept";console.log(used,kept);export{def,o as namespace,kept};'
		);
		// A module's `export` lists print as its first, which their names print in, mangled.
		expect(minifyOnePass(fixture("javascript", "j-spellings-8"), { compress: {}, mangle: true, module: true }).code).toBe(
			'export{k}from"k";let o=1,e=2;export{o as one,e as default};console.log(o,e);'
		);
	});

	it("should print a `switch` case printing as an `if` body as one sequence where it runs expressions only", () => {
		const source = fixture("javascript", "j-spellings-9");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"function f(y,z){if(y===3)console.log(1),console.log(2);if(z===4)console.log(3),console.log(4);else console.log(5),console.log(6)}f(3,4),f(0,0);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop the `break` ending a block the last case of a `switch` ends with", () => {
		const source = fixture("javascript", "j-spellings-11");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe(
			"function f(a,q){switch(a){default:console.log(1);break;case 1:console.log(2)}switch(q){case 2:{let y=a+1;console.log(y,y)}}}f(1,2),f(0,0);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print an infinity a computed key reads as a bare division", () => {
		const source = fixture("javascript", "j-spellings-12");
		const { code } = minifyOnePass(source, { compress: {}, mangle: false });
		expect(code).toBe('var o={Infinity:1,"-Infinity":2};console.log(o[1/0],o[-1/0],void 0,o?.[1/0]);');
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a sequence a statement's `?:` tests first bare", () => {
		// One a nested `?:` tests keeps its parentheses.
		const source = fixture("javascript", "j-spellings-13");
		const { code } = minifyOnePass(source, { compress: { toplevel: false }, mangle: false });
		expect(code).toBe(
			'var b=1,o={c:0};function a(){console.log("a")}a(),b?console.log(1):console.log(2),a(),o.c+b?console.log(3):console.log(4),(a(),b)&&o?console.log(5):console.log(6);'
		);
		expect(runProgram(code)).toBe(runProgram(source));
		// One printing as the assignment it ends reading keeps its parentheses.
		const assigned = fixture("javascript", "j-spellings-15");
		const printed = minifyOnePass(assigned, { compress: {}, mangle: false }).code;
		expect(printed).toBe("function f(n,u){(n=u())+1,(n=u())?console.log(n):u()}f(0,()=>1);");
		expect(runProgram(printed)).toBe(runProgram(assigned));
	});

	it("should set a `var` where the assignment after it sets one of its names", () => {
		// Every declarator after the name sets nothing; a value set before one setting a value stays.
		const declared = fixture("javascript", "j-spellings-6");
		const { code } = minifyOnePass(declared, { compress: {}, mangle: false });
		expect(code).toBe(
			"function log2(v){var r=(v>65535)<<4,shift;return v>>>=r,shift=(v>255)<<3,v>>>=shift,r|=shift,r|v>>1}function keep(v){var a=v+1,b=a,c,d=v;return[a,b,c=d,d]}console.log(log2(65536),keep(1));"
		);
		expect(runProgram(code)).toBe(runProgram(declared));
	});
});

describe("one-pass minify spellings, third round", () => {
	it("should spell a `Number` constant as a shorter number, `**` from ES2016 only", () => {
		const source = fixture("javascript", "p-spellings-1");
		const modern = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false }).code;
		expect(modern).toBe(
			"var x=3,epsilon=2**-52,max=2**53-1,min=-(2**53-1),tiny=5e-324;console.log(epsilon,max,min,tiny,x-(2**53-1),x*(2**-52)),console.log(-(2**-52),(2**-52).toFixed(2),x<2**53-1);"
		);
		expect(runProgram(modern)).toBe(runProgram(source));
		const older = minifyOnePass(source, { compress: {}, ecma: 2015, mangle: false }).code;
		expect(older).toBe(
			"var x=3,epsilon=Number.EPSILON,max=Number.MAX_SAFE_INTEGER,min=Number.MIN_SAFE_INTEGER,tiny=5e-324;console.log(epsilon,max,min,tiny,x-Number.MAX_SAFE_INTEGER,x*Number.EPSILON),console.log(-Number.EPSILON,Number.EPSILON.toFixed(2),x<Number.MAX_SAFE_INTEGER);"
		);
		expect(runProgram(older)).toBe(runProgram(source));
	});

	it("should print a `NaN` the name cannot read as `0/0` where that reads as one value", () => {
		const source = fixture("javascript", "p-spellings-2");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe("function f(NaN){var a=0/0,b=x/+`foo`;console.log(a,b,`NaN`,NaN)}var x=2;f(1);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print a body without braces where its statements print as one", () => {
		// `if`s leaving alike, an `if` throwing as the `throw` after it, and a case's block.
		const source = fixture("javascript", "p-spellings-3");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"function f(x,a,b){while(x--)a||b;return x}function g(x,y){while(x)throw x;throw y}function h(a,c){if(a===3)for(var b of c)console.log(b)}console.log(f(2,0,0));try{g(1,0)}catch(e){console.log(e)}h(3,[4]);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print an integer's `!=0` read as a value as `!!`, but as a branch", () => {
		const source = fixture("javascript", "p-spellings-4");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"var a=5,n=0,v=!!(a&8),w=!!(n&1),q=n?(a&1)!=0:(a&2)!=0;function f(m){return!!(m.flags&4)}console.log(!!(a&1),a>>1!=0,v,w,q,((a&4)!=0)+1,a&1?1:2),console.log(f({flags:4}),f({flags:1}));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should empty the string an unread `+` adds to what converts, joined literals too", () => {
		// A name before a string keeps it.
		const source = fixture("javascript", "p-spellings-5");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"var o={toString(){console.log(`converted`);return`o`}};function f(b){``+b,``+b+o,o+`c`,``+o.toString()}f(o);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should set a `var` whose value reads the `var`s listed after it", () => {
		// One listed before the name set keeps the assignment apart.
		const source = fixture("javascript", "p-spellings-6");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"function x(){return 1}var foo=!(x(),y),x,y;function f(g){var a,b,c;b=a;return[a=g(c),b,c]}console.log(foo,y,f(String));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should parenthesize a call printing as a sequence where its `return` or `throw` prints as a branch of `?:`", () => {
		const source = fixture("javascript", "p-spellings-7");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"!function(){function f(t){let k=t.y;return tok()===142&&!t.x?(next(),k):k}function next(){}function tok(){return 142}console.log(f({y:1}),f({x:1,y:2}));try{(function(t){let k=t.y;throw tok()===142&&!t.x?(next(),k):k})({y:3})}catch(e){console.log(e)}}();"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print an `||` right of a swapped `&&` bare, and `!!` ending a tested sequence as its value", () => {
		const source = fixture("javascript", "p-spellings-9");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"function f(a,b,c,d){a&&b||c()||d();if(c(),b)console.log(`b`)}f(1,1,()=>0,()=>console.log(`d`)),f(0,0,()=>1,()=>console.log(`e`));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print the one value a sequence keeps bare as a branch, a computed key or what a module exports by default", () => {
		const source = fixture("javascript", "p-spellings-10");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false, module: true });
		expect(code).toBe("var foo={};foo[2]=3;var y=foo.k,z={2:3};export default 2;console.log(foo[2],2,y,z[2]);");
	});

	it("should drop the value a logical's left gives where the right decides, a last `null` or a `void`", () => {
		// `void(…)` prints no shorter as a sequence.
		const source = fixture("javascript", "p-spellings-11");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe("var y=0;function g(){return console.log(`g`),2}console.log((y++,1),(y++,1),(y++,g()),void(y,g())??3,y);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold `Boolean` of what an arrow returns", () => {
		const source = fixture("javascript", "p-spellings-12");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe("var truthy=value=>!!value,object=()=>!0;console.log(truthy(0),truthy(`a`),object());");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print `x<<0` and `x>>0` as `x|0` where a `|` reads alike", () => {
		// The right of a `|` would convert its sides in another order.
		const source = fixture("javascript", "p-spellings-13");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"var x=5.7,y=-3.2,o={valueOf(){return console.log(`v`),9.9}},b=2;console.log(x|0,y|0,x+y|0,x|0|b,b|x<<0,(x<<0)+1,-(x<<0),o|0,x>>>0,1);var z=x|0,w={k:y|0},t=`${x|0}`;console.log(z,w.k,t,x<<0<<1);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify of conditions", () => {
	it("should swap the branches of a conditional whose sequence test ends in a `!`", () => {
		for (const [name, expected] of [
			// A `!` its operands took in leaves none to drop.
			[
				"one-pass-condition-c-1",
				'var n=0;function inc(){n++}function test(){return n>1}inc(),test()?console.log("b",n):console.log("a",n),inc(),test()?console.log("b",n):console.log("a",n),inc(),--n?console.log("d",n):console.log("c",n);var k=0;inc(),!n&&!k?console.log("e",n):console.log("f",n);'
			],
			// A comma or parenthesis in a string is no item's end.
			[
				"one-pass-condition-c-2",
				'var n=0;function inc(s){return n++,s}function m(){return n-1}inc(","),(n=m())?console.log("b",n):console.log("a",n),inc(\'(")\'),n?console.log("d",n):console.log("c",n);'
			],
			// It keeps the `!` past a template or regular expression, or with none.
			[
				"one-pass-condition-c-3",
				'var n=0;function inc(s){return n++,s}inc(`,`),!n?console.log("a",n):console.log("b",n),inc(/,/),!n?console.log("c",n):console.log("d",n),inc(),n?console.log("e",n):console.log("f",n);'
			]
		]) {
			const source = fixture("javascript", name);
			const { code } = minifyOnePass(source, { compress: {}, mangle: false });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
		}
	});
});

describe("one-pass minify of reads and calls on literals", () => {
	it("should evaluate what a literal reads and joins at build time", () => {
		for (const [name, expected] of [
			// A literal past the largest number is an infinity the evaluation reads.
			["one-pass-h2-1", "console.log(\"Infinity\",NaN,\"number\",!0);"],
			// `undefined` equals only itself and, loosely, `null`; a read past a literal is `undefined`; a comparison running code or reading a name stays.
			["one-pass-h2-2", "var x;function f(){}console.log(!0,!0,!1,!0,!1,!0),console.log(!0,\"undefined\",NaN,void f()===void 0,x===void 0);"],
			// A key no prototype holds reads past the elements: an index, `-1`, `"01"` or `"1.5"`; `"1"` reads the index; an element running code, a name or `NaN` keeps the read.
			["one-pass-h2-3", "function g(){return 1}var f=console.log;f([][-1],void 0,void 0,void 0,\"b\",void 0),f([g(),1][\"01\"],\"ab\".x,[1,2].foo,[1,2][NaN],2);"],
			// `__proto__:` sets the prototype, which `Object.keys` leaves out where its value runs nothing; a computed `__proto__` is an own key.
			["one-pass-h2-4", "function f(){return{}}console.log([\"a\"],[\"b\"]),console.log(Object.keys({__proto__:f(),c:3}),[\"__proto__\"]);"],
			// A unary or chain picked from a literal prints where a unary stands bare, and a `?.` on a literal reads as `.`; a read or `**` keeps the literal.
			["one-pass-h2-5", "var x=1,a={b:{c:2}};console.log(void 0,-x,!x,a?.b,[a?.b][0].c,[-x][0]**2,x,x);"],
			// A constant folded on the right of a string joins it: `x+(1+"a")+"b"` is `x+"1ab"`.
			["one-pass-h2-6", "function bar(){return 1}var foo=console.log,x=2,c=3;foo(bar()+\"1ab\",bar()+\"a5\",x+1+3+\"b\",bar()+\"a\"+(\"b\"+c));"],
			// A `join` of templates and primitives prints as a template, a template element joining its text; a call, or a template nested in another, keeps the `join`.
			["one-pass-h2-7", "function f(x){return`-${x}-a${x},1${x},${x+\"b\"}`}function g(x){return[`${x}`,String(x)].join(\"\")+\"a\"+[`${x}`,-`${x}`].join()}console.log(f(1),g(2));"],
			// Without a template, it prints as a `+` of strings, a number first taking `""` after it; a name, a `!` of a logical, a run needing an escape joined into a literal, or a longer print keeps the `join`.
			["one-pass-h2-8", "function f(x,y){return+x+1+\"\"+(+y+2)+\"z\"+(x+\"a-\"+-y)+(\"q\"+y*2)}function g(x,y){return[x,1].join(\"\")+[!x&&!y].join(\"\")+(x+\"a1\").length+(+x+\"\")}function h(x,y){return\"Infinity\"+y+(x*1+(\"\"+y))+[x+\"a\",'\"'].join(\"\")+[x<y,y].join(\"\")}console.log(f(1,2),g(3,4),h(5,6));"],
			// A program writing `Array.prototype.join` keeps every `join`.
			["one-pass-h2-9", "Array.prototype.join=function(){return\"patched\"};function f(x){return[+x,\"a\"].join(\"\")}console.log(f(1));"],
			// The `+` takes no parentheses where a value, a branch, a logical, a looser operator or a `+` on its right side stands.
			["one-pass-h2-10", "function f(x,y){var a=x+\"a\"+-y;a+=x+\"b\"+-y;var o={k:x+\"c\"+-y},c=y?x+\"e\"+-y:x+\"f\"+-y,l=y&&x+\"g\"+-y,b=x+\"h\"+-y<y,t=`${x+\"i\"+-y}!`;return console.log(a,o.k,x+\"d\"+-y,c,l,b,t,[x+\"j\"+-y],new String(x+\"k\"+-y)+\"\"),x+\"l\"+-y+(x+\"m\"+-y)}console.log(f(1,2));"],
			// Where `</script` is escaped, pieces that may join into it, `<!--` or `-->` keep the `join`.
			["one-pass-h2-11", "function f(a){return[[`${a}<`,\"/script>\"].join(\"\"),[`${a}<`,\"!--\"].join(\"\"),[`${a}-`,\"->\"].join(\"\"),`${a}-b`]}console.log(f(1));"],
			// A missing key a program writes on `Array.prototype`, `String.prototype` or `Object.prototype` keeps its read.
			["one-pass-h2-12", "Array.prototype[-1]=7,Array.prototype[5]=8,String.prototype[3]=9,console.log([1,2][-1],[1,2][5],void 0,\"ab\"[3],void 0);"],
			// A string ending in `\0` keeps a `join` of a run starting with a digit, which would make it an octal escape.
			["one-pass-h2-13", "function f(a){return[[a+\"\\0\",\"1\"].join(\"\"),a+\"\\0x\"]}console.log(JSON.stringify(f(1)));"],
			// A key no index names reads past a literal, not the node being printed.
			["one-pass-h2-15", "console.log(void 0,void 0,void 0);"]
		]) {
			const source = fixture("javascript", name);
			const { code } = minifyOnePass(source, { compress: {}, mangle: false });
			expect(code).toBe(expected);
			expect(runProgram(code)).toBe(runProgram(source));
			expect(minifyOnePass(code, { compress: {}, mangle: false }).code).toBe(code);
		}
	});

	it("should keep a join whose run starts with `{` after a `$` printed in backticks", () => {
		const source = fixture("javascript", "one-pass-h2-14");
		const options = { compress: {}, ecma: 2015, mangle: false };
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("function f(x){return[[x+`$`,`{oops}`].join(``),x+`a{b}`]}console.log(f(1));");
		expect(runProgram(code)).toBe(runProgram(source));
		expect(minifyOnePass(code, options).code).toBe(code);
	});
});

describe("one-pass minify hazards", () => {
	it("should keep a script's only call where the function's body leaves a `var` it hoists", () => {
		// Unwrapped, the `var` would be a global another script can set.
		const source = fixture("javascript", "hz-1");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe("!function(){if(a===void 0)console.log(1);var a}();");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a script's only call where the function's body leaves a `var` a dead branch declares", () => {
		const source = fixture("javascript", "hz-2");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe("!function(){var a;if(a===void 0)console.log(1)}();");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should not fold a value writing `arguments` past a read of a parameter it aliases", () => {
		const source = fixture("javascript", "hz-3");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"function h(a,v){console.log(a,v)}function f(a){var v=arguments[0]=2;h(a,v)}f(1);function k(a){var v=arguments.length=2;h(a,v)}k(1);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should not fold a call past a read of a script's global, which the call may set", () => {
		const source = fixture("javascript", "hz-4");
		const { code } = minifyOnePass(source, { compress: {}, ecma: 2020, mangle: false });
		expect(code).toBe(
			"var x=1;function f(){var v=g();h(x,v)}this.g=function(){return this.x=2,3},this.h=function(a,b){console.log(a,b)},f();"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify of functions read once, family A", () => {
	const options = { compress: { toplevel: true }, ecma: 2020, mangle: false };

	it("should print a moved function's statements where a `return` calls it, its `var` joining the caller's", () => {
		const source = fixture("javascript", "one-pass-inline-a-1");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"[function(){for(var i=0;i<2;i++);console.log(`test`,i)}][0]();"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a moved function called where its `var` would hide a name of the caller", () => {
		const source = fixture("javascript", "one-pass-inline-a-2");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"var run=function(i){(function(){for(var i=0;i<2;i++);console.log(`test`,i)})();console.log(i)};run(5),run(6);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a pure value into a call of a pure member such as `console.log`", () => {
		const source = fixture("javascript", "one-pass-inline-a-3");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("console.log(Math.random()<1);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should not fold a value running code past the member it calls, which the value may set", () => {
		const source = fixture("javascript", "one-pass-inline-a-4");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"var e=Math.round((console.log=function(){},1));console.log(e);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop a member read of a function declaration read once", () => {
		const source = fixture("javascript", "one-pass-inline-a-5");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("console.log(`done`);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a member read of a `var` function read once, which may be read unset", () => {
		const source = fixture("javascript", "one-pass-inline-a-6");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("(function(){}).b;console.log(`done`);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should drop an unread parameter passed a constant where every parameter goes", () => {
		const source = fixture("javascript", "one-pass-inline-a-7");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("console.log(9);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep an unread parameter passed a constant beside one passed a name", () => {
		const source = fixture("javascript", "one-pass-inline-a-8");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"function f(x){!function(a,b){console.log(b)}(3,x)}f([1]),f([2]);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should print each read of an object of constants at a key it sets as that key's last value", () => {
		const source = fixture("javascript", "one-pass-inline-a-9");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe("console.log(2,`x`);");
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep an object of constants read at a key it does not set or one not known", () => {
		const source = fixture("javascript", "one-pass-inline-a-10");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"let o={a:1,b:2};console.log(o.a,o.c),console.log(o.b,o[0]);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep an object setting its prototype or holding a getter", () => {
		const source = fixture("javascript", "one-pass-inline-a-11");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"let o={__proto__:{b:2},a:1};console.log(o.a,o.b);let p={a:1,get b(){return 2}};console.log(p.a,p.b);"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});
});

describe("one-pass minify of unused values and side effects, fourth round", () => {
	it("should drop what only makes a value nobody reads, keeping what may run code", () => {
		const cases = [
			// What is never nullish leaves `??` nothing to run: `||` and `?:` of such values, `??` of one; `&&` may give its left side.
			[fixture("javascript", "one-pass-unused-d-1"), "a&&b===c,x=a||1,y=a?1:2,z=a??1,w=(a&&1)??g(),v=(a?1:b)??g();"],
			// A fold's kept operand drops its parentheses where a value stands bare, but a sequence's and an `in` a loop's head reads.
			[fixture("javascript", "one-pass-unused-d-2"), "x=a?1:2;var y=b?1:2;function f(){return c?1:2}z=(a,1);for(var i=(a in b?1:2);i;)f();"],
			// A `delete` of a write nobody reads runs the value, then gives `true`; a read name keeps the write.
			[fixture("javascript", "one-pass-unused-d-3"), "function f(){return o.f,!0}function g(){return(o.f,!0).x}function h(){return!0}function k(){let t;return[(t=o.f,!0),t]}"],
			// A loop's body running nothing is `;`, a write to a name nobody reads too, a loop's `let` among them; a global read stays.
			[fixture("javascript", "one-pass-unused-d-4"), "function f(){for(;g(););}for(let j;g();)h();while(g());for(x in y);for(;g();)a;"],
			// A call marked pure of a function written in place prints its arguments alone; a callee that runs code stays.
			[fixture("javascript", "one-pass-unused-d-5"), "y,z,a(),y(),z,g()(y),g();"],
			// An empty function written in place and called is `void` of its arguments; a spread or a default stays.
			[fixture("javascript", "one-pass-unused-d-6"), "var u=void a,v=void b();f(void c),w=(()=>{})(...d),x=function(a={}){}(e);"],
			// `if(x)return y;return x` is `return x&&y`, but where `y` binds looser, the name differs, or a call in place prints.
			[fixture("javascript", "one-pass-unused-d-7"), "function a(x){return x&&42}function b(x){return x&&1}function c(x){return x&&(g(),y)}function d(x){return x?p||q:x}function e(x){return x?42:y}function k(x){return x&&h}function m(x){return x&&void 0}function n(x){return x?function(){g()}():x}"],
			// A known test's branch opening as an object, function or class prints bare, in parentheses first in a statement or an arrow's body; nested in one, it stays.
			[fixture("javascript", "one-pass-unused-d-8"), "({}).foo=2,x={}.foo,v=function(){return this}(),f(()=>({})),f(()=>(1?{}:1).x),y=1,{}.foo=2,z=class{}.w;"],
			// `instanceof` of an object made in place, or a primitive, and a constructor every edition defines runs nothing; a name, a `__proto__`, a later built-in or one no constructor may run code or throw.
			[fixture("javascript", "one-pass-unused-d-9"), "x instanceof Object,{__proto__:p}instanceof Object,[]instanceof Map,[]instanceof Math,[g()]instanceof Object;function f(Object){[]instanceof Object}"],
			// A function returning `eval` read, not calling it, prints it in place, as no `this` binds; a direct `eval` stays in its function.
			[fixture("javascript", "one-pass-unused-d-10"), "(0,eval)(x),y=eval,z=(()=>eval(x))();"],
			// A loop's head runs its first and last parts for their effects alone.
			[fixture("javascript", "one-pass-unused-d-11"), "for(a&&b!==c||d();e();f&&g!==h||i())j();for(k();e();l,m())j();"],
			// What `||` runs last nobody reads where it goes unread, but right of `&&`; there a swap drops a `!`, and `??` takes no place beside `||`.
			[fixture("javascript", "one-pass-unused-d-12"), "u()||a&&b!==c||d(),u()&&(!a||b===c)&&d(),u()||(a!==b||c!==d)&&z(),u()||x==null&&y(),x??y();"],
			// A chain of one operator left of the other, nobody reading it, negates whole where that is shorter.
			[fixture("javascript", "one-pass-unused-d-13"), "(a||b||c||d||e)&&f(),a&&b&&c||d()||e(),a&&b!==c&&d||e(),!a&&x&&!c||f(),x=!a&&!b&&!c||f();"],
			// A constructor whose members a write may set, through the global object too, keeps its `instanceof`;
			// a computed key may be `__proto__`, so the program keeps every one.
			[fixture("javascript", "one-pass-unused-d-14"), "globalThis.Object[Symbol.hasInstance]=h,[]instanceof Object,1 instanceof Array;"],
			[fixture("javascript", "one-pass-unused-d-15"), "Object.defineProperty(Error,Symbol.hasInstance,{value:h}),1 instanceof Error;"],
			// A program that may set a prototype, a proxy's traps then running on `instanceof`, keeps every one.
			[fixture("javascript", "one-pass-unused-d-18"), "Object.setPrototypeOf(Array.prototype,p),[]instanceof Date,after();"],
			[fixture("javascript", "one-pass-unused-d-19"), "o.__proto__=p,[]instanceof Date,Array.prototype[k]=q,after();"],
			[fixture("javascript", "one-pass-unused-d-20"), "globalThis.Object.setPrototypeOf(Array.prototype,p),[]instanceof Date,after();"],
			// A known branch opening with `{` as an arrow's body takes parentheses, whatever node it is.
			[fixture("javascript", "one-pass-unused-d-16"), "f=()=>({}.x),g=()=>({}+1),h=()=>({a:1}),k=()=>a;"],
			// An empty call prints as `void` of its arguments, a `?:` branch a `return` chain prints too.
			[fixture("javascript", "one-pass-unused-d-17"), "function g(c){return c?void a():void b()}function k(){a()}"]
		];
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, { compress: { ecma: 2020 }, ecma: 2020, mangle: false }).code).toBe(expected);
		}
	});

	it("should keep a known branch an `export default` opens with `function` or `class` an expression", () => {
		const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false, module: true };
		// Bare, an anonymous function would take the name `default`.
		expect(minifyOnePass(fixture("javascript", "one-pass-unused-d-21"), options).code).toBe(
			"export default 1?function(){}:null;"
		);
		// Only a function itself prints its parentheses as a second pass does.
		expect(minifyOnePass(fixture("javascript", "one-pass-unused-d-22"), options).code).toBe(
			"export default 1?function(){}.x:null;"
		);
	});

	it("should keep a known branch an anonymous function or class whose place would name it", () => {
		const source = fixture("javascript", "one-pass-unused-d-23");
		const { code } = minifyOnePass(source, { compress: { ecma: 2020 }, ecma: 2020, mangle: false });
		expect(code).toBe("var x=1?function(){}:null;y=1?class{}:null,o={a:1?function(){}:0},g(function(){});");
	});

	it("should merge `if`s returning a property written shorthand or not, and keep a method apart", () => {
		expect(
			minifyOnePass(fixture("javascript", "one-pass-g2-1"), { compress: { ecma: 2020 }, ecma: 2020, mangle: false }).code
		).toBe("function f(body){if(a||b||c)return{body}}function g(body){if(a)return{body};if(b)return{body(){}}}");
	});

	it("should join a loop's opening `if(x)break` to its test past a name the body scopes that the test reads not", () => {
		const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };
		expect(minifyOnePass(fixture("javascript", "one-pass-g2-2"), options).code).toBe(
			"for(;!x;){let y=foo();bar(y),bar(y)}while(t&&!x(i)){class C{}bar(C),bar(C)}for(;x;){q();let y=foo();bar(y),bar(y)}"
		);
		// A test reading the name, maybe through `eval`, or a body declaring a pattern or a labeled function, keeps the `if`.
		expect(minifyOnePass(fixture("javascript", "one-pass-g2-3"), options).code).toBe(
			"for(;;){if(y)break;let y=foo();bar(y),bar(y)}for(;;){if(eval(`y`))break;let y=foo();bar(y),bar(y)}for(;;){if(x)break;let{y}=foo();bar(y),bar(y)}for(;;){if(x)break;l:function h(){}bar(h)}"
		);
	});
});

describe("one-pass minify of known tests and switches, family E", () => {
	const options = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };

	it("should fold a `var` set once to a falsy value where a function another runs first only tests it", () => {
		const source = fixture("javascript", "one-pass-e2-1");
		const { code } = minifyOnePass(source, options);
		// Read before it is set, it is `undefined`, as falsy: the tail never runs.
		expect(code).toBe(
			'function load(exports,require){exports.run=function(render,props){return wrap(render,props)},exports.again=function(render,props){return wrap(render,props)};require("lib");function wrap(render,props){return render(props)}}var exportsObject={};load(exportsObject,function(){return{}}),console.log(exportsObject.run(function(props){return props.a},{a:1}));'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a `var` set after a call where it is truthy or read for more than its truth", () => {
		const source = fixture("javascript", "one-pass-e2-2");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			'function load(exports,require){exports.run=function(value){return check(value)},exports.again=function(value){return check(value)},require("lib");var enabled=!0,disabled=0;function check(value){return!enabled?`off`:disabled===0?`zero`:value}}var exportsObject={};load(exportsObject,function(){}),console.log(exportsObject.run(1));'
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold the test of a `var` a branch sets falsy, and keep one written elsewhere", () => {
		const source = fixture("javascript", "one-pass-e2-3");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"function pick(flag){if(flag)var seen=!1;return`ok`}function count(flag){if(flag)var seen=!1;return(seen=flag)?`set`:`unset`}console.log(pick(!0),pick(!1),count(!1));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold a `switch` of a known value whose earlier tests run something, those running first", () => {
		const source = fixture("javascript", "one-pass-e2-4");
		const { code } = minifyOnePass(source, options);
		expect(code).toBe(
			"function log(name){console.log(name)}function first(){log(`a`),log(`two`)}function fallback(){log(`b`),log(`default`),log(`after`)}function none(){log(`c`),log(`d`)}first(),fallback(),none();"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should keep a `switch` whose test is known by no literal, or whose dead case declares what stays", () => {
		const source = fixture("javascript", "one-pass-e2-5");
		const { code } = minifyOnePass(source, options);
		// A `let` or `class` in a case that never runs goes only with the whole `switch`.
		expect(code).toBe(
			"function log(name){console.log(name)}var k=1;switch(1){case log(`a`),k:log(`one`)}function f(q){if(q)switch(3){case log(`b`),1:break;var v}return v}switch(3){case log(`c`),1:}log(f(1));"
		);
		expect(runProgram(code)).toBe(runProgram(source));
	});

	it("should fold an exported `const` where it is read once set, not where a call may run first", () => {
		const source = fixture("javascript", "one-pass-e2-6");
		const { code } = minifyOnePass(source, { ...options, module: true });
		expect(code).toBe(
			"export const mode=`staging`;export const resolved=`other`;export function late(){return mode+`!`}"
		);
	});

	it("should drop what a constructor, a class or a pattern made in place never reads", () => {
		const options = { compress: { ecma: 2020, toplevel: true }, ecma: 2020, mangle: false };
		/** @type {[string, string][]} */
		const cases = [
			// `new` of a function or class known where it is called passes what its parameters take, and past them only what runs.
			[fixture("javascript", "one-pass-f2-1"), "function F(a){this.a=a}class C{constructor(a){this.a=a}}class B{}out.f=new F(1,g()),out.c=new C(1,h(),k(),m()),out.b=new B,out.e=new function(){this.e=1},out.x=new class{constructor(){this.x=1}},out.d=new function({value}){this.value=value}({value:1}),out.F=F,out.C=C;"],
			// A rest, a default or `arguments` reading the arguments, a derived class's default constructor and a spread keep them.
			[fixture("javascript", "one-pass-f2-2"), "function A(a,b){this.a=a}function R(...r){this.r=r}function D(a=arguments[1]){this.a=a}class P extends Q{}class S{constructor(){this.n=arguments.length}}out.a=new A(1,2),out.r=new R(1,2),out.d=new D(void 0,2),out.p=new P(1,2),out.s=new S(1,2),out.l=new class{constructor(){this.f=()=>arguments}}(1,2),out.u=new A(...v,1),out.A=A,out.R=R,out.D=D,out.P=P,out.S=S;"],
			// An `eval` may read `arguments`.
			[fixture("javascript", "one-pass-f2-9"), "out.t=new function(){eval(`this.n = arguments.length`)}(1,2),out.c=new class{constructor(){eval(`this.n = arguments.length`)}}(1,2);"],
			// `new` of a class running nothing goes; a key, field, block or constructor running code, a field reading `this` or `super`, or heritage keep it.
			[fixture("javascript", "one-pass-f2-3"), "new class{[k()](){}},new class{a=g()},new class{a=this.b;get b(){return g()}},new class{a=()=>super.x},new class{static{g()}},new class{constructor(){g()}},new class{constructor(x=g()){}},new class extends Base{},new class{}(g());"],
			// A base class's constructor taking nothing but a rest and running nothing is its default one.
			[fixture("javascript", "one-pass-f2-4"), "class A{m(){}}class B{}class C{}class D extends A{constructor(){}}class E{constructor(a){}}class F{constructor(){g()}}class G{constructor(...[a]){}}class H{static constructor(){}}out.l=[A,B,C,D,E,F,G,H];"],
			// An object pattern nothing reads goes where it takes apart a literal by plain keys, each default a constant or a function.
			[fixture("javascript", "one-pass-f2-5"), "let{kept=`kept`,read=`read`}={};console.log(read);"],
			// A getter, `__proto__`, a default running code, a function's `arguments` or `caller`, a computed key, another value or pattern keep it.
			[fixture("javascript", "one-pass-f2-6"), "let{a}={get a(){return log(`getter`)}},{b}={__proto__:proto},{c=log(`default`)}={},{arguments:d}=()=>{},{caller:e}=function(){},{[key]:f}={},{g}=source,{h:{i}}={h:{}},[j]=[];log(`value`);let{...l}=[];"],
			// A declarator going prints what its array or object runs, but one whose value prints where it is read.
			[fixture("javascript", "one-pass-f2-7"), "out.f=function(p){g();h();k();if(!(p instanceof A||p instanceof B)||p&&p.init!==this)m()};"],
			// A primitive spread in parentheses, or the global `undefined`, copies nothing too.
			[fixture("javascript", "one-pass-f2-8"), "console.log({a:1},{b:2},{},{...void f()},{...`ab`},{c:3}),out.g=function(undefined){return{...undefined}};"]
		];
		for (const [source, expected] of cases) {
			expect(minifyOnePass(source, options).code).toBe(expected);
		}
		// What the constructors and patterns run is kept.
		for (const [prelude, name] of [
			['var out={},g=()=>console.log("g"),h=g,k=g,m=g;', "one-pass-f2-1"],
			['var log=console.log,proto={},key="k",source={};', "one-pass-f2-6"]
		]) {
			const source = `${prelude}${fixture("javascript", name)}`;
			expect(runProgram(minifyOnePass(source, options).code)).toBe(runProgram(source));
		}
	});
});
