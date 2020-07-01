/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {(string|number|undefined|[])[]} SemVerRange */
/** @typedef {(string|number|undefined|[])[]} SemVerVersion */

const removeStars = arr => {
	while (/^[Xx*]$/.test(arr[arr.length - 1])) arr.pop();
	return arr;
};

/**
 * @param {string} str version string
 * @returns {SemVerVersion} parsed version
 */
const parseVersion = str => {
	if (!str) return [];
	const match = /^([^-+]+)(?:-([^+]+))?(?:\+(.+))?$/.exec(str);
	const convertToNumber = item => (`${+item}` === item ? +item : item);
	const version = removeStars(match[1].split(".").map(convertToNumber));
	const prerelease = match[2]
		? removeStars(match[2].split(".").map(convertToNumber))
		: [];
	const build = match[3] ? match[3].split(".").map(convertToNumber) : [];
	if (prerelease.length) {
		return build.length
			? // eslint-disable-next-line no-sparse-arrays
			  [...version, , ...prerelease, [], ...build]
			: // eslint-disable-next-line no-sparse-arrays
			  [...version, , ...prerelease];
	} else {
		// eslint-disable-next-line no-sparse-arrays
		return build.length ? [...version, [], ...build] : version;
	}
};
exports.parseVersion = parseVersion;

/* eslint-disable eqeqeq */
const versionToString = version => {
	if (!version) return "[unknown]";
	for (var str = "", needDot = 1, i = 0; i < version.length; i++) {
		var item = version[i];
		var t = (typeof item)[0];
		needDot--;
		str +=
			t == "u"
				? // undefined: prerelease marker, add an "-"
				  "-"
				: t == "o"
				? // object: build marker, add an "+"
				  "+"
				: // number or string: add the item, set flag to add an "." between two of them
				  (needDot > 0 ? "." : "") + ((needDot = 2), item);
	}
	return str;
};
/* eslint-enable eqeqeq */
exports.versionToString = versionToString;

// must be a minimized version of above
exports.versionToStringRuntimeCode = runtimeTemplate =>
	`var versionToString = ${runtimeTemplate.basicFunction("version", [
		"// see webpack/lib/util/semver.js for original code",
		'if(!version)return"[unknown]";for(var r="",n=1,o=0;o<version.length;o++){var e=version[o],t=(typeof e)[0];n--,r+="u"==t?"-":"o"==t?"+":(n>0?".":"")+(n=2,e)}return r'
	])}`;

/* eslint-disable eqeqeq */
/**
 * @param {SemVerVersion} a version
 * @param {SemVerVersion} b version
 * @returns {boolean} true, iff a < b
 */
const versionLt = (a, b) => {
	var i = 0;
	for (;;) {
		// a       b  EOA     object  undefined  number  string
		// EOA        a == b  a < b   b < a      a < b   a < b
		// object     b < a   (0)     b < a      a < b   a < b
		// undefined  a < b   a < b   (0)        a < b   a < b
		// number     b < a   b < a   b < a      (1)     a < b
		// string     b < a   b < a   b < a      b < a   (1)
		// EOA end of array
		// (0) continue on
		// (1) compare them via "<"

		// Handles first row in table
		if (i >= a.length) return i < b.length && (typeof b[i])[0] != "u";

		var aValue = a[i];
		var aType = (typeof aValue)[0];

		// Handles first column in table
		if (i >= b.length) return aType == "u";

		var bValue = b[i];
		var bType = (typeof bValue)[0];

		if (aType == bType) {
			if (aType != "o" && aType != "u" && aValue != bValue) {
				return aValue < bValue;
			}
			i++;
		} else {
			// Handles remaining cases
			if (aType == "o" && bType == "n") return true;
			return bType == "s" || aType == "u";
		}
	}
};
/* eslint-enable eqeqeq */
exports.versionLt = versionLt;

// must be a minimized version of above
exports.versionLtRuntimeCode = runtimeTemplate =>
	`var versionLt = ${runtimeTemplate.basicFunction("a, b", [
		"// see webpack/lib/util/semver.js for original code",
		'for(var r=0;;){if(r>=a.length)return r<b.length&&"u"!=(typeof b[r])[0];var t=a[r],e=(typeof t)[0];if(r>=b.length)return"u"==e;var n=b[r],f=(typeof n)[0];if(e!=f)return"o"==e&&"n"==f||("s"==f||"u"==e);if("o"!=e&&"u"!=e&&t!=n)return t<n;r++}'
	])}`;

/**
 * @param {string} str range string
 * @returns {SemVerRange} parsed range
 */
exports.parseRange = str => {
	// see https://docs.npmjs.com/misc/semver#range-grammar for grammar
	const parsePartial = str => {
		const v = parseVersion(str);
		return [0, ...v];
	};
	const toFixed = range => {
		if (range.length === 1) {
			// Special case for "*" is "x.x.x" instead of "="
			return [0];
		} else if (range.length === 2) {
			// Special case for "1" is "1.x.x" instead of "=1"
			return [1, ...range.slice(1)];
		} else if (range.length === 3) {
			// Special case for "1.2" is "1.2.x" instead of "=1.2"
			return [2, ...range.slice(1)];
		} else {
			return [range.length, ...range.slice(1)];
		}
	};
	const negate = range => {
		return [-range[0] - 1, ...range.slice(1)];
	};
	const parseSimple = str => {
		// simple     ::= primitive | partial | tilde | caret
		// primitive  ::= ( '<' | '>' | '>=' | '<=' | '=' ) partial
		// tilde      ::= '~' partial
		// caret      ::= '^' partial
		const match = /^(\^|~|<=|<|>=|>|=|v|!)/.exec(str);
		const start = match ? match[0] : "";
		const remainder = parsePartial(str.slice(start.length));
		switch (start) {
			case "^":
				if (remainder.length > 1 && remainder[1] === 0) {
					if (remainder.length > 2 && remainder[2] === 0) {
						return [3, ...remainder.slice(1)];
					}
					return [2, ...remainder.slice(1)];
				}
				return [1, ...remainder.slice(1)];
			case "~":
				return [2, ...remainder.slice(1)];
			case ">=":
				return remainder;
			case "=":
			case "v":
			case "":
				return toFixed(remainder);
			case "<":
				return negate(remainder);
			case ">": {
				// and( >=, not( = ) ) => >=, =, not, and
				const fixed = toFixed(remainder);
				// eslint-disable-next-line no-sparse-arrays
				return [, fixed, 0, remainder, 2];
			}
			case "<=":
				// or( <, = ) => <, =, or
				// eslint-disable-next-line no-sparse-arrays
				return [, toFixed(remainder), negate(remainder), 1];
			case "!": {
				// not =
				const fixed = toFixed(remainder);
				// eslint-disable-next-line no-sparse-arrays
				return [, fixed, 0];
			}
			default:
				throw new Error("Unexpected start value");
		}
	};
	const combine = (items, fn) => {
		if (items.length === 1) return items[0];
		const arr = [];
		for (const item of items.slice().reverse()) {
			if (0 in item) {
				arr.push(item);
			} else {
				arr.push(...item.slice(1));
			}
		}
		// eslint-disable-next-line no-sparse-arrays
		return [, ...arr, ...items.slice(1).map(() => fn)];
	};
	const parseRange = str => {
		// range      ::= hyphen | simple ( ' ' simple ) * | ''
		// hyphen     ::= partial ' - ' partial
		const items = str.split(" - ");
		if (items.length === 1) {
			const items = str.trim().split(/\s+/g).map(parseSimple);
			return combine(items, 2);
		}
		const a = parsePartial(items[0]);
		const b = parsePartial(items[1]);
		// >=a <=b => and( >=a, or( <b, =b ) ) => >=a, <b, =b, or, and
		// eslint-disable-next-line no-sparse-arrays
		return [, toFixed(b), negate(b), 1, a, 2];
	};
	const parseLogicalOr = str => {
		// range-set  ::= range ( logical-or range ) *
		// logical-or ::= ( ' ' ) * '||' ( ' ' ) *
		const items = str.split(/\s*\|\|\s*/).map(parseRange);
		return combine(items, 1);
	};
	return parseLogicalOr(str);
};

/* eslint-disable eqeqeq */
const rangeToString = range => {
	if (0 in range) {
		var str = "";
		var fixCount = range[0];
		str +=
			fixCount == 0
				? ">="
				: fixCount == -1
				? "<"
				: fixCount == 1
				? "^"
				: fixCount == 2
				? "~"
				: fixCount > 0
				? "="
				: "!=";
		var needDot = 1;
		// eslint-disable-next-line no-redeclare
		for (var i = 1; i < range.length; i++) {
			var item = range[i];
			var t = (typeof item)[0];
			needDot--;
			str +=
				t == "u"
					? // undefined: prerelease marker, add an "-"
					  "-"
					: t == "o"
					? // object: build marker, add an "+"
					  "+"
					: // number or string: add the item, set flag to add an "." between two of them
					  (needDot > 0 ? "." : "") + ((needDot = 2), item);
		}
		return str;
	} else {
		var stack = [];
		// eslint-disable-next-line no-redeclare
		for (var i = 1; i < range.length; i++) {
			// eslint-disable-next-line no-redeclare
			var item = range[i];
			stack.push(
				item === 0
					? "not(" + pop() + ")"
					: item === 1
					? "(" + pop() + " || " + pop() + ")"
					: item === 2
					? stack.pop() + " " + stack.pop()
					: rangeToString(item)
			);
		}
		return pop();
	}
	function pop() {
		return stack.pop().replace(/^\((.+)\)$/, "$1");
	}
};
/* eslint-enable eqeqeq */
exports.rangeToString = rangeToString;

// must be a minimized version of above
exports.rangeToStringRuntimeCode = runtimeTemplate =>
	`var rangeToString = ${runtimeTemplate.basicFunction("range", [
		"// see webpack/lib/util/semver.js for original code",
		'if(0 in range){var r="",n=range[0];r+=0==n?">=":-1==n?"<":1==n?"^":2==n?"~":n>0?"=":"!=";for(var e=1,a=1;a<range.length;a++){var o=(typeof(t=range[a]))[0];e--,r+="u"==o?"-":"o"==o?"+":(e>0?".":"")+(e=2,t)}return r}var g=[];for(a=1;a<range.length;a++){var t=range[a];g.push(0===t?"not("+p()+")":1===t?"("+p()+" || "+p()+")":2===t?g.pop()+" "+g.pop():rangeToString(t))}return p();function p(){return g.pop().replace(/^\\((.+)\\)$/,"$1")}'
	])}`;

/* eslint-disable eqeqeq */
/**
 * @param {SemVerRange} range version range
 * @param {SemVerVersion} version the version
 * @returns {boolean} if version satisfy the range
 */
const satisfy = (range, version) => {
	if (0 in range) {
		var fixCount = range[0];
		// when negated is set it swill set for < instead of >=
		var negated = fixCount < 0;
		if (negated) fixCount = -fixCount - 1;
		for (var i = 0, j = 1, isEqual = true; ; j++, i++) {
			// cspell:word nequal nequ

			// when isEqual = true:
			// range         version: EOA      undefined  object  number    string
			// EOA                    equal    block      bigger  big-ver   big-ver
			// undefined              bigger   next       bigger  big-ver   big-ver
			// object                 smaller  block      next    big-ver   big-ver
			// number                 smaller  block      smaller cmp       big-cmp
			// fixed number           smaller  block      smaller cmp-fix   differ
			// string                 smaller  block      smaller differ    cmp
			// fixed string           smaller  block      smaller small-cmp cmp-fix

			// when isEqual = false:
			// range         version: EOA      undefined  object  number    string
			// EOA                    nequal   block      nequal  next-ver  next-ver
			// undefined              nequal   block      nequal  next-ver  next-ver
			// object                 nequal   block      nequal  next-ver  next-ver
			// number                 nequal   block      nequal  next      next
			// fixed number           nequal   block      nequal  next      next   (this never happens)
			// string                 nequal   block      nequal  next      next
			// fixed string           nequal   block      nequal  next      next   (this never happens)

			// EOA end of array
			// equal (version is equal range):
			//   when !negated: return true,
			//   when negated: return false
			// bigger (version is bigger as range):
			//   when fixed: return false,
			//   when !negated: return true,
			//   when negated: return false,
			// smaller (version is smaller as range):
			//   when !negated: return false,
			//   when negated: return true
			// nequal (version is not equal range (> resp <)): return true
			// block (version is in different prerelease area): return false
			// differ (version is different from fixed range (string vs. number)): return false
			// next: continues to the next items
			// next-ver: when fixed: return false, continues to the next item only for the version, sets isEqual=false
			// big-ver: when fixed || negated: return false, continues to the next item only for the version, sets isEqual=false
			// next-nequ: continues to the next items, sets isEqual=false
			// cmp (negated === false): version < range => return false, version > range => next-nequ, else => next
			// cmp (negated === true): version > range => return false, version < range => next-nequ, else => next
			// cmp-fix: version == range => next, else => return false
			// big-cmp: when negated => return false, else => next-nequ
			// small-cmp: when negated => next-nequ, else => return false

			var rangeType = j < range.length ? (typeof range[j])[0] : "";

			// Handles first column in both tables
			if (i >= version.length) {
				// Handles nequal
				if (!isEqual) return true;
				// Handles bigger
				if (rangeType == "u") return j > fixCount && !negated;
				// Handles equal and smaller: (range === EOA) XOR negated
				return (rangeType == "") != negated; // equal + smaller
			}

			var versionValue = version[i];
			var versionType = (typeof versionValue)[0];

			// Handles second column in both tables
			if (versionType == "u") {
				if (!isEqual || rangeType != "u") {
					return false;
				}
			}

			// switch between first and second table
			else if (isEqual) {
				// Handle diagonal
				if (rangeType == versionType) {
					if (versionType != "o") {
						if (j <= fixCount) {
							// Handles "cmp-fix" cases
							if (versionValue != range[j]) {
								return false;
							}
						} else {
							// Handles "cmp" cases
							if (negated ? versionValue > range[j] : versionValue < range[j]) {
								return false;
							}
							if (versionValue != range[j]) isEqual = false;
						}
					}
				}

				// Handle 3rd column
				else if (versionType == "o") {
					// Handle bigger
					if (rangeType == "" || rangeType == "u") {
						return !negated && j > fixCount;
					}
					// Handler smaller
					return negated;
				}

				// Handle big-ver
				else if (rangeType != "s" && rangeType != "n") {
					if (negated || j <= fixCount) return false;
					isEqual = false;
					j--;
				}

				// Handle differ
				else if (j <= fixCount) {
					return false;
				}

				// Handle big-cmp and small-cmp
				else if (versionType < rangeType != negated) {
					return false;
				}
			} else {
				// Handle 3rd column in the second table
				if (versionType == "o") {
					return true;
				}

				// Handles all "next-ver" cases in the second table
				if (rangeType != "s" && rangeType != "n") {
					isEqual = false;
					j--;
				}

				// next is applied by default
			}
		}
	}
	/** @type {(boolean | number)[]} */
	var stack = [];
	// eslint-disable-next-line no-redeclare
	for (var i = 1; i < range.length; i++) {
		var item = /** @type {SemVerRange | 0 | 1 | 2} */ (range[i]);
		stack.push(
			item == 1
				? /** @type {number} */ (stack.pop()) |
						/** @type {number} */ (stack.pop())
				: item == 2
				? /** @type {number} */ (stack.pop()) &
				  /** @type {number} */ (stack.pop())
				: item
				? satisfy(item, version)
				: !stack.pop()
		);
	}
	return !!stack[0];
};
/* eslint-enable eqeqeq */
exports.satisfy = satisfy;

// must be a minimized version of above
exports.satisfyRuntimeCode = runtimeTemplate =>
	`var satisfy = ${runtimeTemplate.basicFunction("range, version", [
		"// see webpack/lib/util/semver.js for original code",
		'if(0 in range){var r=range[0],e=r<0;e&&(r=-r-1);for(var n=0,f=1,i=!0;;f++,n++){var a=f<range.length?(typeof range[f])[0]:"";if(n>=version.length)return!i||("u"==a?f>r&&!e:""==a!=e);var t=version[n],o=(typeof t)[0];if("u"==o){if(!i||"u"!=a)return!1}else if(i)if(a==o){if("o"!=o)if(f<=r){if(t!=range[f])return!1}else{if(e?t>range[f]:t<range[f])return!1;t!=range[f]&&(i=!1)}}else{if("o"==o)return""==a||"u"==a?!e&&f>r:e;if("s"!=a&&"n"!=a){if(e||f<=r)return!1;i=!1,f--}else{if(f<=r)return!1;if(o<a!=e)return!1}}else{if("o"==o)return!0;"s"!=a&&"n"!=a&&(i=!1,f--)}}}var u=[];for(n=1;n<range.length;n++){var g=range[n];u.push(1==g?u.pop()|u.pop():2==g?u.pop()&u.pop():g?satisfy(g,version):!u.pop())}return!!u[0]'
	])}`;

exports.stringifyHoley = json => {
	switch (typeof json) {
		case "undefined":
			return "";
		case "object":
			if (Array.isArray(json)) {
				let str = "[";
				for (let i = 0; i < json.length; i++) {
					if (i !== 0) str += ",";
					str += this.stringifyHoley(json[i]);
				}
				str += "]";
				return str;
			} else {
				return JSON.stringify(json);
			}
		default:
			return JSON.stringify(json);
	}
};
