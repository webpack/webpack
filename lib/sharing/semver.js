/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import RuntimeTemplate from "../template/RuntimeTemplate" */
/** @typedef {string | number} VersionValue */
/** @typedef {VersionValue | undefined} SemVerRangeItem */
/** @typedef {(SemVerRangeItem | SemVerRangeItem[])[]} SemVerRange */

/**
 * Returns parsed version.
 * @param {string} str version string
 * @returns {SemVerRange} parsed version
 */
const parseVersion = (str) => {
	/**
	 * Returns result.
	 * @param {str} str str
	 * @returns {VersionValue[]} result
	 */
	var splitAndConvert = function (str) {
		return str.split(".").map(function (item) {
			// eslint-disable-next-line eqeqeq
			return +item == /** @type {string | number} */ (item) ? +item : item;
		});
	};

	var match =
		/** @type {RegExpExecArray} */
		(/^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str));

	/** @type {(VersionValue | undefined | [])[]} */
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
module.exports.parseVersion = parseVersion;

/* eslint-disable eqeqeq */
/**
 * Returns true, iff a < b.
 * @param {string} a version
 * @param {string} b version
 * @returns {boolean} true, iff a < b
 */
const versionLt = (a, b) => {
	var aParts = parseVersion(a);
	var bParts = parseVersion(b);
	var i = 0;
	for (;;) {
		// WHY: the ordering this loop implements, by the type of each side.
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
		if (i >= aParts.length) {
			return i < bParts.length && (typeof bParts[i])[0] != "u";
		}

		var aValue = aParts[i];
		var aType = (typeof aValue)[0];

		// Handles first column in table
		if (i >= bParts.length) return aType == "u";

		var bValue = bParts[i];
		var bType = (typeof bValue)[0];

		if (aType == bType) {
			if (aType != "o" && aType != "u" && aValue != bValue) {
				// equal tags other than "o" and "u": both are a string or both a number
				return (
					/** @type {VersionValue} */ (aValue) <
					/** @type {VersionValue} */ (bValue)
				);
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
module.exports.versionLt = versionLt;

/**
 * Returns parsed range.
 * @param {string} str range string
 * @returns {SemVerRange} parsed range
 */
module.exports.parseRange = (str) => {
	/**
	 * Returns result.
	 * @param {string} str str
	 * @returns {VersionValue[]} result
	 */
	const splitAndConvert = (str) => {
		return str
			.split(".")
			.map((item) => (item !== "NaN" && `${+item}` === item ? +item : item));
	};

	// see https://docs.npmjs.com/misc/semver#range-grammar for grammar
	/**
	 * Returns the sem ver range item.
	 * @param {string} str str
	 * @returns {SemVerRangeItem[]}
	 */
	const parsePartial = (str) => {
		const match = /^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(str);
		if (!match) throw new Error(`Invalid version range "${str}"`);
		/** @type {SemVerRangeItem[]} */
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

	/**
	 * Returns the sem ver range item.
	 *
	 * @param {SemVerRangeItem[]} range range
	 * @returns {SemVerRangeItem[]}
	 */
	const toFixed = (range) => {
		if (range.length === 1) {
			// Special case for "*" is "x.x.x" instead of "="
			return [0];
		} else if (range.length === 2) {
			// Special case for "1" is "1.x.x" instead of "=1"
			return [1, ...range.slice(1)];
		} else if (range.length === 3) {
			// Special case for "1.2" is "1.2.x" instead of "=1.2"
			return [2, ...range.slice(1)];
		}

		return [range.length, ...range.slice(1)];
	};

	/**
	 * Returns result.
	 *
	 * @param {SemVerRangeItem[]} range
	 * @returns {SemVerRangeItem[]} result
	 */
	const negate = (range) => {
		return [-(/** @type { [number]} */ (range)[0]) - 1, ...range.slice(1)];
	};

	/**
	 * Returns the sem ver range.
	 * @param {string} str str
	 * @returns {SemVerRange}
	 */
	const parseSimple = (str) => {
		// WHY: the grammar this parses.
		// simple       ::= primitive | partial | tilde | caret
		// primitive    ::= ( '<' | '>' | '>=' | '<=' | '=' | '!' ) ( ' ' ) * partial
		// tilde        ::= '~' ( ' ' ) * partial
		// caret        ::= '^' ( ' ' ) * partial
		const match = /^(\^|~|<=|<|>=|>|=|v|!)/.exec(str);
		const start = match ? match[0] : "";
		const remainder = parsePartial(
			start.length ? str.slice(start.length).trim() : str.trim()
		);

		switch (start) {
			case "^":
				// never fix more components than the partial wrote
				if (remainder.length > 2 && remainder[1] === 0) {
					if (remainder.length > 3 && remainder[2] === 0) {
						return [3, ...remainder.slice(1)];
					}
					return [2, ...remainder.slice(1)];
				}
				return [Math.min(1, remainder.length - 1), ...remainder.slice(1)];
			case "~":
				return [Math.min(2, remainder.length - 1), ...remainder.slice(1)];
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

	/**
	 * Returns result.
	 *
	 * @param {SemVerRangeItem[][]} items items
	 * @param {number} fn fn
	 * @returns {SemVerRange} result
	 */
	const combine = (items, fn) => {
		if (items.length === 1) return items[0];
		/** @type {SemVerRange} */
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

	/**
	 * Returns the sem ver range.
	 * @param {string} str str
	 * @returns {SemVerRange}
	 */
	const parseRange = (str) => {
		// range      ::= hyphen | simple ( ' ' ( ' ' ) * simple ) * | ''
		// hyphen     ::= partial ( ' ' ) * ' - ' ( ' ' ) * partial
		const items = str.split(/\s+-\s+/);

		if (items.length === 1) {
			str = str.trim();

			/** @type {SemVerRangeItem[][]} */
			const items = [];
			const r = /[-0-9A-Za-z]\s+/g;
			var start = 0;
			/** @type {RegExpExecArray | null} */
			var match;
			while ((match = r.exec(str))) {
				const end = match.index + 1;
				items.push(
					/** @type {SemVerRangeItem[]} */
					(parseSimple(str.slice(start, end).trim()))
				);
				start = end;
			}
			items.push(
				/** @type {SemVerRangeItem[]} */
				(parseSimple(str.slice(start).trim()))
			);
			return combine(items, 2);
		}

		const a = parsePartial(items[0]);
		const b = parsePartial(items[1]);
		// >=a <=b => and( >=a, or( <b, =b ) ) => >=a, <b, =b, or, and
		// eslint-disable-next-line no-sparse-arrays
		return [, toFixed(b), negate(b), 1, a, 2];
	};

	/**
	 * Returns the sem ver range.
	 * @param {string} str str
	 * @returns {SemVerRange}
	 */
	const parseLogicalOr = (str) => {
		// range-set  ::= range ( logical-or range ) *
		// logical-or ::= ( ' ' ) * '||' ( ' ' ) *
		const items =
			/** @type {SemVerRangeItem[][]} */
			(str.split(/\s*\|\|\s*/).map(parseRange));

		return combine(items, 1);
	};

	return parseLogicalOr(str);
};

/* eslint-disable eqeqeq */
/**
 * Returns the string.
 * @param {SemVerRange} range
 * @returns {string}
 */
const rangeToString = (range) => {
	var fixCount = /** @type {number} */ (range[0]);
	var str = "";
	if (range.length === 1) {
		return "*";
	} else if (fixCount + 0.5) {
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
	}
	/** @type {string[]} */
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
						: rangeToString(/** @type {SemVerRange} */ (item))
		);
	}
	return pop();

	function pop() {
		return /** @type {string} */ (stack.pop()).replace(/^\((.+)\)$/, "$1");
	}
};

module.exports.rangeToString = rangeToString;

/**
 * Returns if version satisfy the range.
 * @param {SemVerRange} range version range
 * @param {string} version the version
 * @returns {boolean} if version satisfy the range
 */
const satisfy = (range, version) => {
	if (0 in range) {
		var parsedVersion = parseVersion(version);
		var fixCount = /** @type {number} */ (range[0]);
		// when negated is set it swill set for < instead of >=
		var negated = fixCount < 0;
		if (negated) fixCount = -fixCount - 1;
		for (var i = 0, j = 1, isEqual = true; ; j++, i++) {
			// cspell:word nequal nequ

			// WHY: the decision table this loop implements, when isEqual = true:
			// range         version: EOA/object  undefined  number    string
			// EOA                    equal       block      big-ver   big-ver
			// undefined              bigger      next       big-ver   big-ver
			// number                 smaller     block      cmp       big-cmp
			// fixed number           smaller     block      cmp-fix   differ
			// string                 smaller     block      differ    cmp
			// fixed string           smaller     block      small-cmp cmp-fix

			// WHY: and when isEqual = false:
			// range         version: EOA/object  undefined  number    string
			// EOA                    nequal      block      next-ver  next-ver
			// undefined              nequal      block      next-ver  next-ver
			// number                 nequal      block      next      next
			// fixed number           nequal      block      next      next   (this never happens)
			// string                 nequal      block      next      next
			// fixed string           nequal      block      next      next   (this never happens)

			// WHY: EOA is end of array; what each cell of the two tables means:
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

			var rangeType =
				/** @type {"s" | "n" | "u" | ""} */
				(j < range.length ? (typeof range[j])[0] : "");

			/** @type {SemVerRange[number] | undefined} */
			var versionValue;
			/** @type {"n" | "s" | "u" | "o" | undefined} */
			var versionType;

			// Handles first column in both tables (end of version or object)
			if (
				i >= parsedVersion.length ||
				((versionValue = parsedVersion[i]),
				(versionType = /** @type {"n" | "s" | "u" | "o"} */ (
					(typeof versionValue)[0]
				)) == "o")
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
						if (
							negated
								? /** @type {VersionValue} */ (versionValue) >
									/** @type {VersionValue[]} */ (range)[j]
								: /** @type {VersionValue} */ (versionValue) <
									/** @type {VersionValue[]} */ (range)[j]
						) {
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
				// eslint-disable-next-line no-lonely-if
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
		var item = /** @type {SemVerRangeItem[] | 0 | 1 | 2} */ (range[i]);

		stack.push(
			item == 1
				? /** @type {() => number} */ (p)() | /** @type {() => number} */ (p)()
				: item == 2
					? /** @type {() => number} */ (p)() &
						/** @type {() => number} */ (p)()
					: item
						? satisfy(item, version)
						: !p()
		);
	}
	return !!p();
};
/* eslint-enable eqeqeq */
module.exports.satisfy = satisfy;

/**
 * Returns the string.
 * @param {SemVerRange | string | number | false | undefined} json
 * @returns {string}
 */
module.exports.stringifyHoley = (json) => {
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
			}

			return JSON.stringify(json);
		default:
			return JSON.stringify(json);
	}
};

//#region runtime code: parseVersion
/**
 * @param {RuntimeTemplate} runtimeTemplate
 * @returns {string}
 */
module.exports.parseVersionRuntimeCode = (runtimeTemplate) =>
	`var parseVersion = ${runtimeTemplate.basicFunction("str", [
		"// see webpack/lib/sharing/semver.js for original code",
		`var t=${runtimeTemplate.supportsArrowFunction() ? "t=>" : "function(t)"}{return t.split(".").map(${runtimeTemplate.supportsArrowFunction() ? "t=>" : "function(t)"}{return+t==t?+t:t})},r=/^([^-+]+)?(?:-([^+]+))?(?:\\+(.+))?$/.exec(str),e=r[1]?t(r[1]):[];if(r[2])e.length++,e.push.apply(e,t(r[2]));if(r[3])e.push([]),e.push.apply(e,t(r[3]));return e;`
	])}`;
//#endregion

//#region runtime code: versionLt
/**
 * @param {RuntimeTemplate} runtimeTemplate
 * @returns {string}
 */
module.exports.versionLtRuntimeCode = (runtimeTemplate) =>
	`var versionLt = ${runtimeTemplate.basicFunction("a, b", [
		"// see webpack/lib/sharing/semver.js for original code",
		'var e=parseVersion(a),r=parseVersion(b),t=0;for(;;){if(t>=e.length)return t<r.length&&(typeof r[t])[0]!="u";var u=e[t],p=(typeof u)[0];if(t>=r.length)return p=="u";var i=r[t],s=(typeof i)[0];if(p==s){if(p!="o"&&p!="u"&&u!=i)return u<i;t++}else return p=="o"&&s=="n"?!0:s=="s"||p=="u"}'
	])}`;
//#endregion

//#region runtime code: rangeToString
/**
 * @param {RuntimeTemplate} runtimeTemplate
 * @returns {string}
 */
module.exports.rangeToStringRuntimeCode = (runtimeTemplate) =>
	`var rangeToString = ${runtimeTemplate.basicFunction("range", [
		"// see webpack/lib/sharing/semver.js for original code",
		'var t=range[0],e="";if(range.length===1)return"*";if(t+.5){e+=t==0?">=":t==-1?"<":t==1?"^":t==2?"~":t>0?"=":"!=";for(var r=1,n=1;n<range.length;n++){var i=range[n],o=(typeof i)[0];r--,e+=o=="u"?"-":(r>0?".":"")+(r=2,i)}return e}var a=[];for(var n=1;n<range.length;n++){var i=range[n];a.push(i===0?"not("+p()+")":i===1?"("+p()+" || "+p()+")":i===2?a.pop()+" "+a.pop():rangeToString(i))}return p();function p(){return a.pop().replace(/^\\((.+)\\)$/,"$1")}'
	])}`;
//#endregion

//#region runtime code: satisfy
/**
 * @param {RuntimeTemplate} runtimeTemplate
 * @returns {string}
 */
module.exports.satisfyRuntimeCode = (runtimeTemplate) =>
	`var satisfy = ${runtimeTemplate.basicFunction("range, version", [
		"// see webpack/lib/sharing/semver.js for original code",
		'if(0 in range){var e=parseVersion(version),r=range[0],a=r<0;if(a)r=-r-1;for(var n=0,i=1,s=!0;;i++,n++){var t=i<range.length?(typeof range[i])[0]:"",f,u;if(n>=e.length||(f=e[n],(u=(typeof f)[0])=="o"))return!s?!0:t=="u"?i>r&&!a:t==""!=a;if(u=="u"){if(!s||t!="u")return!1}else if(s)if(t==u)if(i<=r){if(f!=range[i])return!1}else{if(a?f>range[i]:f<range[i])return!1;if(f!=range[i])s=!1}else if(t!="s"&&t!="n"){if(a||i<=r)return!1;s=!1,i--}else if(i<=r||u<t!=a)return!1;else s=!1;else if(t!="s"&&t!="n")s=!1,i--}}var l=[],o=l.pop.bind(l);for(var n=1;n<range.length;n++){var p=range[n];l.push(p==1?o()|o():p==2?o()&o():p?satisfy(p,version):!o())}return!!o();'
	])}`;
//#endregion
