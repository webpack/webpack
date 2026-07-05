/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Template = require("../Template");

/** @typedef {import("estree").Node} Node */
/** @typedef {import("../javascript/JavascriptModulesPlugin").Scope} Scope */
/** @typedef {import("../javascript/JavascriptModulesPlugin").Reference} Reference */
/** @typedef {import("../javascript/JavascriptModulesPlugin").Variable} Variable */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {Set<string>} UsedNames */

const DEFAULT_EXPORT = "__WEBPACK_DEFAULT_EXPORT__";
const NAMESPACE_OBJECT_EXPORT = "__WEBPACK_NAMESPACE_OBJECT__";

/**
 * Gets all references.
 * @param {Variable} variable variable
 * @returns {Reference[]} references
 */
const getAllReferences = (variable) => {
	let set = variable.references;
	// Look for inner scope variables too (like in class Foo { t() { Foo } })
	// identifiers is tiny (usually 1 declaration) — indexOf beats a Set here
	const identifiers = variable.identifiers;
	for (const scope of variable.scope.childScopes) {
		for (const innerVar of scope.variables) {
			if (innerVar.identifiers.some((id) => identifiers.includes(id))) {
				// copy-on-write to keep the common no-match case allocation-free
				if (set === variable.references) set = [...set];
				for (const ref of innerVar.references) set.push(ref);
				break;
			}
		}
	}
	return set;
};

/**
 * Returns result.
 * @param {Node | Node[]} ast ast
 * @param {Node} node node
 * @returns {undefined | Node[]} result
 */
const getPathInAst = (ast, node) => {
	if (ast === node) {
		return [];
	}

	const nr = /** @type {Range} */ (node.range);

	/**
	 * Returns result.
	 * @param {Node} n node
	 * @returns {Node[] | undefined} result
	 */
	const enterNode = (n) => {
		if (!n) return;
		const r = n.range;
		if (r && r[0] <= nr[0] && r[1] >= nr[1]) {
			const path = getPathInAst(n, node);
			if (path) {
				path.push(n);
				return path;
			}
		}
	};

	if (Array.isArray(ast)) {
		// sibling ranges are ordered and disjoint; binary search the container
		let lo = 0;
		let hi = ast.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			const item = ast[mid];
			const r = item && item.range;
			if (!r) {
				// holes or range-less nodes: scan the remaining window linearly
				for (let i = lo; i <= hi; i++) {
					const enterResult = enterNode(ast[i]);
					if (enterResult !== undefined) return enterResult;
				}
				return;
			}
			if (r[0] > nr[0]) {
				hi = mid - 1;
			} else if (nr[0] >= r[1]) {
				lo = mid + 1;
			} else {
				return r[1] >= nr[1] ? enterNode(item) : undefined;
			}
		}
	} else if (ast && typeof ast === "object") {
		const keys =
			/** @type {(keyof Node)[]} */
			(Object.keys(ast));
		for (let i = 0; i < keys.length; i++) {
			// We are making the faster check in `enterNode` using `n.range`
			const value =
				ast[
					/** @type {Exclude<keyof Node, "range" | "loc" | "leadingComments" | "trailingComments">} */
					(keys[i])
				];
			if (Array.isArray(value)) {
				const pathResult = getPathInAst(value, node);
				if (pathResult !== undefined) return pathResult;
			} else if (value && typeof value === "object") {
				const enterResult = enterNode(value);
				if (enterResult !== undefined) return enterResult;
			}
		}
	}
};

/** @type {Map<string, string[]>} */
const splittedInfoCache = new Map();

/**
 * Returns path segments of the cleaned extra info.
 * @param {string} extraInfo extra info
 * @returns {string[]} cleaned path segments
 */
const getSplittedInfo = (extraInfo) => {
	let splittedInfo = splittedInfoCache.get(extraInfo);
	if (splittedInfo === undefined) {
		// bound the cache — extraInfo repeats for every renamed binding of a
		// module, but distinct values grow with project size
		if (splittedInfoCache.size >= 4096) splittedInfoCache.clear();
		// Remove uncool stuff
		splittedInfo = extraInfo
			.replace(
				/\.+\/|(?:\/index)?\.[a-zA-Z0-9]{1,4}(?:$|\s|\?)|\s*\+\s*\d+\s*modules/g,
				""
			)
			.split("/");
		splittedInfoCache.set(extraInfo, splittedInfo);
	}
	return splittedInfo;
};

/**
 * Returns found new name.
 * @param {string} oldName old name
 * @param {UsedNames} usedNamed1 used named 1
 * @param {UsedNames} usedNamed2 used named 2
 * @param {string} extraInfo extra info
 * @returns {string} found new name
 */
function findNewName(oldName, usedNamed1, usedNamed2, extraInfo) {
	let name = oldName;

	if (name === DEFAULT_EXPORT) {
		name = "";
	}
	if (name === NAMESPACE_OBJECT_EXPORT) {
		name = "namespaceObject";
	}

	const splittedInfo = getSplittedInfo(extraInfo);
	for (let i = splittedInfo.length - 1; i >= 0; i--) {
		name = splittedInfo[i] + (name ? `_${name}` : "");
		const nameIdent = Template.toIdentifier(name);
		if (
			!usedNamed1.has(nameIdent) &&
			(!usedNamed2 || !usedNamed2.has(nameIdent))
		) {
			return nameIdent;
		}
	}

	// `_${i}` is identifier-safe, so escaping the base once is equivalent to
	// escaping every candidate — avoids two regexes per collision
	const nameIdent = Template.toIdentifier(name);
	let i = 0;
	let nameWithNumber = `${nameIdent}_${i}`;
	while (
		usedNamed1.has(nameWithNumber) ||
		// eslint-disable-next-line no-unmodified-loop-condition
		(usedNamed2 && usedNamed2.has(nameWithNumber))
	) {
		i++;
		nameWithNumber = `${nameIdent}_${i}`;
	}
	return nameWithNumber;
}

/** @typedef {Set<Scope>} ScopeSet */

/**
 * Adds scope symbols.
 * @param {Scope | null} s scope
 * @param {UsedNames} nameSet name set
 * @param {ScopeSet} scopeSet1 scope set 1
 * @param {ScopeSet} scopeSet2 scope set 2
 */
const addScopeSymbols = (s, nameSet, scopeSet1, scopeSet2) => {
	let scope = s;
	while (scope) {
		if (scopeSet1.has(scope)) break;
		if (scopeSet2.has(scope)) break;
		scopeSet1.add(scope);
		for (const variable of scope.variables) {
			nameSet.add(variable.name);
		}
		scope = scope.upper;
	}
};

const RESERVED_NAMES = new Set(
	[
		// internal names (should always be renamed)
		DEFAULT_EXPORT,
		NAMESPACE_OBJECT_EXPORT,

		// keywords
		"abstract,arguments,async,await,boolean,break,byte,case,catch,char,class,const,continue",
		"debugger,default,delete,do,double,else,enum,eval,export,extends,false,final,finally,float",
		"for,function,goto,if,implements,import,in,instanceof,int,interface,let,long,native,new,null",
		"package,private,protected,public,return,short,static,super,switch,synchronized,this,throw",
		"throws,transient,true,try,typeof,var,void,volatile,while,with,yield",

		// commonjs/amd
		"module,__dirname,__filename,exports,require,define",

		// js globals
		"Array,Date,eval,function,hasOwnProperty,Infinity,isFinite,isNaN,isPrototypeOf,length,Math",
		"NaN,name,Number,Object,prototype,String,Symbol,toString,undefined,valueOf",

		// browser globals
		"alert,all,anchor,anchors,area,assign,blur,button,checkbox,clearInterval,clearTimeout",
		"clientInformation,close,closed,confirm,constructor,crypto,decodeURI,decodeURIComponent",
		"defaultStatus,document,element,elements,embed,embeds,encodeURI,encodeURIComponent,escape",
		"event,fileUpload,focus,form,forms,frame,innerHeight,innerWidth,layer,layers,link,location",
		"mimeTypes,navigate,navigator,frames,frameRate,hidden,history,image,images,offscreenBuffering",
		"open,opener,option,outerHeight,outerWidth,packages,pageXOffset,pageYOffset,parent,parseFloat",
		"parseInt,password,pkcs11,plugin,prompt,propertyIsEnum,radio,reset,screenX,screenY,scroll",
		"secure,select,self,setInterval,setTimeout,status,submit,taint,text,textarea,top,unescape",
		"untaint,window",

		// window events
		"onblur,onclick,onerror,onfocus,onkeydown,onkeypress,onkeyup,onmouseover,onload,onmouseup,onmousedown,onsubmit"
	]
		.join(",")
		.split(",")
);

/** @typedef {{ usedNames: UsedNames, alreadyCheckedScopes: ScopeSet }} ScopeInfo */
/** @typedef {Map<string, Map<string, ScopeInfo>>} UsedNamesInScopeInfo */

/**
 * Gets used names in scope info.
 * @param {UsedNamesInScopeInfo} usedNamesInScopeInfo used names in scope info
 * @param {string} module module identifier
 * @param {string} id export id
 * @returns {ScopeInfo} info
 */
const getUsedNamesInScopeInfo = (usedNamesInScopeInfo, module, id) => {
	// nested maps avoid building a `${module}-${id}` key string per lookup
	let byId = usedNamesInScopeInfo.get(module);
	if (byId === undefined) {
		byId = new Map();
		usedNamesInScopeInfo.set(module, byId);
	}
	let info = byId.get(id);
	if (info === undefined) {
		info = {
			usedNames: new Set(),
			alreadyCheckedScopes: new Set()
		};
		byId.set(id, info);
	}
	return info;
};

module.exports = {
	DEFAULT_EXPORT,
	NAMESPACE_OBJECT_EXPORT,
	RESERVED_NAMES,
	addScopeSymbols,
	findNewName,
	getAllReferences,
	getPathInAst,
	getUsedNamesInScopeInfo
};
