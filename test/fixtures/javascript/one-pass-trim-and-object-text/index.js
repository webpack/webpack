// A trim folds where each character it reads is white space, or not, alike
// in every engine: ASCII, the C1 controls and the code points ES5 lists.
console.log(JSON.stringify("\ufeffa\ufeff".trim()));
console.log(JSON.stringify("\u0085a\u0085".trim()));
console.log(JSON.stringify("\u00a0\u2028x\u2029".trim()));
console.log(JSON.stringify(" a\u00e9b ".trim()));
// `trimStart` and `trimEnd` fold where `ecma` is 2019 or later.
console.log(JSON.stringify("\ufeffa".trimStart()));
console.log(JSON.stringify("a\ufeff".trimEnd()));
// White space by Unicode category, or once so, and a kept end outside the set stay.
console.log(JSON.stringify("\u3000a".trim()));
console.log(JSON.stringify("\u180ea".trim()));
console.log(JSON.stringify("\u200ba".trim()));
console.log(JSON.stringify("x\u00e9 ".trim()));
console.log(JSON.stringify("\u00e9 x".trim()));
console.log(JSON.stringify("\u00e9".toUpperCase()));

// An object literal no key of which converts it searches as "[object Object]".
console.log("abc[object Object]".indexOf({ a: 2 }));
console.log("x[object Object]".lastIndexOf({}));
console.log("[object Object]".indexOf({ a: 1, b: "c", d: [1] }));
console.log("a".concat({}));
// A key of its own, an accessor or a new prototype converts it otherwise.
console.log(
	"x[object Object]".indexOf({
		toString: function () {
			return "x";
		}
	})
);
console.log(
	"[object Object]".indexOf({
		valueOf: function () {
			return "Object";
		}
	})
);
console.log(
	"[object Object]".indexOf({
		get a() {
			return 1;
		}
	})
);
console.log(
	"[object Object]".indexOf({
		[Symbol.toStringTag]: "Tag"
	})
);
try {
	console.log("[object Object]".indexOf({ __proto__: null }));
} catch (err) {
	console.log(err instanceof TypeError);
}
console.log("[object Object]".indexOf({ a: console.log("runs") }));
