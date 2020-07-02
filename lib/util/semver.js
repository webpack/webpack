/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {(string|number|undefined|[])[]} SemVerRange */

const splitAndConvert = str => {
	return str.split(".").map(item => (`${+item}` === item ? +item : item));
};

/**
 * @param {string} str version string
 * @returns {(string|number|undefined|[])[]} parsed version
 */
const parseVersion = str => {
	var match = /^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str);
	/** @type {(string|number|undefined|[])[]} */
	var ver = match[1] ? splitAndConvert(match[1]) : [];
	if (match[2]) {
		ver.length++;
		ver.push.apply(ver, splitAndConvert(match[2]));
	}
	if (match[3]) {
		ver.push([]);
		ver.push.apply(ver, splitAndConvert(match[3]));
	}
	return ver;
};
exports.parseVersion = parseVersion;

// must be a minimized version of above
exports.parseVersionRuntimeCode = runtimeTemplate =>
	`var parseVersion = ${runtimeTemplate.basicFunction("str", [
		`var convertNumber = ${runtimeTemplate.returningFunction(
			"+str == str ? +str : str;",
			"str"
		)};`,
		`var splitAndConvert = ${runtimeTemplate.returningFunction(
			'str.split(".").map(convertNumber);',
			"str"
		)};`,
		"// see webpack/lib/util/semver.js for original code",
		"var n=/^([^-+]+)?(?:-([^+]+))?(?:\\+(.+))?$/.exec(str),p=n[1]?splitAndConvert(n[1]):[];return n[2]&&(p.length++,p.push.apply(p,splitAndConvert(n[2]))),n[3]&&(p.push([]),p.push.apply(p,splitAndConvert(n[3]))),p"
	])}`;

/* eslint-disable eqeqeq */
/**
 * @param {string} a version
 * @param {string} b version
 * @returns {boolean} true, iff a < b
 */
const versionLt = (a, b) => {
	// @ts-expect-error
	a = parseVersion(a);
	// @ts-expect-error
	b = parseVersion(b);
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
		const match = /^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str);
		/** @type {(string|number|undefined|[])[]} */
		const ver = match[1] ? [0, ...splitAndConvert(match[1])] : [0];
		if (match[2]) {
			ver.length++;
			ver.push.apply(ver, splitAndConvert(match[2]));
		}

		// remove trailing any matchers
		let last = ver[ver.length - 1];
		while (
			ver.length &&
			(last === undefined || /^[*xX]$/.test(/** @type {string} */ (last)))
		) {
			ver.pop();
			last = ver[ver.length - 1];
		}

		return ver;
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
	if (range.length === 1) {
		return "*";
	} else if (0 in range) {
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
		'if(1===range.length)return"*";if(0 in range){var r="",n=range[0];r+=0==n?">=":-1==n?"<":1==n?"^":2==n?"~":n>0?"=":"!=";for(var e=1,a=1;a<range.length;a++){e--,r+="u"==(typeof(t=range[a]))[0]?"-":(e>0?".":"")+(e=2,t)}return r}var g=[];for(a=1;a<range.length;a++){var t=range[a];g.push(0===t?"not("+o()+")":1===t?"("+o()+" || "+o()+")":2===t?g.pop()+" "+g.pop():rangeToString(t))}return o();function o(){return g.pop().replace(/^\\((.+)\\)$/,"$1")}'
	])}`;

/* eslint-disable eqeqeq */
/**
 * @param {SemVerRange} range version range
 * @param {string} version the version
 * @returns {boolean} if version satisfy the range
 */
const satisfy = (range, version) => {
	if (0 in range) {
		// @ts-expect-error
		version = parseVersion(version);
		var fixCount = range[0];
		// when negated is set it swill set for < instead of >=
		var negated = fixCount < 0;
		if (negated) fixCount = -fixCount - 1;
		for (var i = 0, j = 1, isEqual = true; ; j++, i++) {
			// cspell:word nequal nequ

			// when isEqual = true:
			// range         version: EOA/object  undefined  number    string
			// EOA                    equal       block      big-ver   big-ver
			// undefined              bigger      next       big-ver   big-ver
			// number                 smaller     block      cmp       big-cmp
			// fixed number           smaller     block      cmp-fix   differ
			// string                 smaller     block      differ    cmp
			// fixed string           smaller     block      small-cmp cmp-fix

			// when isEqual = false:
			// range         version: EOA/object  undefined  number    string
			// EOA                    nequal      block      next-ver  next-ver
			// undefined              nequal      block      next-ver  next-ver
			// number                 nequal      block      next      next
			// fixed number           nequal      block      next      next   (this never happens)
			// string                 nequal      block      next      next
			// fixed string           nequal      block      next      next   (this never happens)

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

			var versionValue;
			var versionType;

			// Handles first column in both tables (end of version or object)
			if (
				i >= version.length ||
				((versionValue = version[i]),
				(versionType = (typeof versionValue)[0]) == "o")
			) {
				// Handles nequal
				if (!isEqual) return true;
				// Handles bigger
				if (rangeType == "u") return j > fixCount && !negated;
				// Handles equal and smaller: (range === EOA) XOR negated
				return (rangeType == "") != negated; // equal + smaller
			}

			// Handles second column in both tables (version = undefined)
			if (versionType == "u") {
				if (!isEqual || rangeType != "u") {
					return false;
				}
			}

			// switch between first and second table
			else if (isEqual) {
				// Handle diagonal
				if (rangeType == versionType) {
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

				// Handle big-ver
				else if (rangeType != "s" && rangeType != "n") {
					if (negated || j <= fixCount) return false;
					isEqual = false;
					j--;
				}

				// Handle differ, big-cmp and small-cmp
				else if (j <= fixCount || versionType < rangeType != negated) {
					return false;
				} else {
					isEqual = false;
				}
			} else {
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
	var p = stack.pop.bind(stack);
	// eslint-disable-next-line no-redeclare
	for (var i = 1; i < range.length; i++) {
		var item = /** @type {SemVerRange | 0 | 1 | 2} */ (range[i]);
		stack.push(
			item == 1
				? p() | p()
				: item == 2
				? p() & p()
				: item
				? satisfy(item, version)
				: !p()
		);
	}
	return !!p();
};
/* eslint-enable eqeqeq */
exports.satisfy = satisfy;

// must be a minimized version of above
exports.satisfyRuntimeCode = runtimeTemplate =>
	`var satisfy = ${runtimeTemplate.basicFunction("range, version", [
		"// see webpack/lib/util/semver.js for original code",
		'if(0 in range){version=parseVersion(version);var e=range[0],r=e<0;r&&(e=-e-1);for(var n=0,i=1,f=!0;;i++,n++){var a,s,t=i<range.length?(typeof range[i])[0]:"";if(n>=version.length||"o"==(s=(typeof(a=version[n]))[0]))return!f||("u"==t?i>e&&!r:""==t!=r);if("u"==s){if(!f||"u"!=t)return!1}else if(f)if(t==s)if(i<=e){if(a!=range[i])return!1}else{if(r?a>range[i]:a<range[i])return!1;a!=range[i]&&(f=!1)}else if("s"!=t&&"n"!=t){if(r||i<=e)return!1;f=!1,i--}else{if(i<=e||s<t!=r)return!1;f=!1}else"s"!=t&&"n"!=t&&(f=!1,i--)}}var g=[],o=g.pop.bind(g);for(n=1;n<range.length;n++){var u=range[n];g.push(1==u?o()|o():2==u?o()&o():u?satisfy(u,version):!o())}return!!o()'
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
