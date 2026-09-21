/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Template = require("../template/Template");

/** @import { Identifier } from "estree" */
/** @import { Optimization } from "../../declarations/WebpackOptions" */
/**
 * @import {
 * 	Scope,
 * 	Reference,
 * 	Variable
 * } from "../javascript/JavascriptModulesPlugin"
 */
/** @typedef {Set<string>} UsedNames */

const DEFAULT_EXPORT = "__WEBPACK_DEFAULT_EXPORT__";
const NAMESPACE_OBJECT_EXPORT = "__WEBPACK_NAMESPACE_OBJECT__";

/**
 * Whether CommonJS modules and require edges take part in concatenation.
 * @param {Optimization["concatenateModules"]} concatenateModules the optimization.concatenateModules option
 * @returns {boolean} true when CommonJS concatenation is enabled
 */
const isCommonJsConcatenationEnabled = (concatenateModules) =>
	typeof concatenateModules === "object"
		? concatenateModules.commonjs !== false
		: concatenateModules === true;

/** @type {WeakMap<Scope, Map<Identifier, Variable>>} */
const sharedInnerBindingsCache = new WeakMap();

/**
 * The inner bindings sharing a declaring identifier with their own scope — a
 * class name binds twice. Indexed once per scope; per binding it is quadratic.
 * @param {Scope} scope the scope whose children to index
 * @returns {Map<Identifier, Variable>} the inner binding sharing each identifier
 */
const getSharedInnerBindings = (scope) => {
	const cached = sharedInnerBindingsCache.get(scope);
	if (cached !== undefined) return cached;
	/** @type {Map<Identifier, Variable>} */
	const shared = new Map();
	/** @type {Set<Identifier>} */
	const declared = new Set();
	for (const variable of scope.variables) {
		for (const identifier of variable.identifiers) declared.add(identifier);
	}
	if (declared.size !== 0) {
		for (const child of scope.childScopes) {
			for (const innerVariable of child.variables) {
				for (const identifier of innerVariable.identifiers) {
					if (declared.has(identifier)) shared.set(identifier, innerVariable);
				}
			}
		}
	}
	sharedInnerBindingsCache.set(scope, shared);
	return shared;
};

/**
 * Gets all references.
 * @param {Variable} variable variable
 * @returns {Reference[]} references
 */
const getAllReferences = (variable) => {
	// the inner binding of `class Foo { t() { Foo } }` holds references to the
	// same name, and renaming has to move them too
	const shared = getSharedInnerBindings(variable.scope);
	if (shared.size === 0) return variable.references;
	let set = variable.references;
	/** @type {Variable | undefined} */
	let last;
	for (const identifier of variable.identifiers) {
		const innerVariable = shared.get(identifier);
		if (innerVariable === undefined || innerVariable === last) continue;
		last = innerVariable;
		// copy-on-write to keep the common no-match case allocation-free
		if (set === variable.references) set = [...set];
		for (const reference of innerVariable.references) set.push(reference);
	}
	return set;
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

// A string literal, kept whole, or an identifier that is not a property name;
const IDENTIFIER_OR_STRING_REGEXP =
	/"(?:[^"\\]|\\.)*"|(?<![.\w$])[A-Za-z_$][\w$]*/g;

/**
 * Renames every identifier of a printed expression that the map names, keeping
 * property names and string contents as they are.
 * @param {string} expression the expression as printed
 * @param {Map<string, string>} renames original to new name
 * @returns {string} the expression over the new names
 * @example
 * const renames = new Map([["store", "entry_store"], ["x", "entry_x"]]);
 * renameIdentifiers("store.x", renames) === "entry_store.x"
 * renameIdentifiers('store["a-b"]', renames) === 'entry_store["a-b"]'
 * renameIdentifiers("store/* .x *\/.c", renames) === "entry_store/* .x *\/.c"
 * renameIdentifiers("(store_default())", renames) === "(store_default())"
 * renameIdentifiers("/* reads x *\/ x", renames) === "/* reads entry_x *\/ entry_x"
 */
const renameIdentifiers = (expression, renames) =>
	expression.replace(IDENTIFIER_OR_STRING_REGEXP, (token) => {
		const renamed = renames.get(token);
		return renamed === undefined ? token : renamed;
	});

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

// WHY: Declared by the chunk bootstrap in the scope module code is hoisted
// into, so re-bundling a webpack bundle collides with them: the `const` one
// fails to parse and the `var` one silently clobbers the module table.
// CompatibilityPlugin renames the other two runtime names.
const CHUNK_RUNTIME_DECLARATIONS = new Set([
	"__webpack_modules__",
	"__webpack_module_cache__"
]);

const RESERVED_NAMES = new Set(
	[
		// internal names (should always be renamed)
		DEFAULT_EXPORT,
		NAMESPACE_OBJECT_EXPORT,
		...CHUNK_RUNTIME_DECLARATIONS,

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
	CHUNK_RUNTIME_DECLARATIONS,
	DEFAULT_EXPORT,
	NAMESPACE_OBJECT_EXPORT,
	RESERVED_NAMES,
	addScopeSymbols,
	findNewName,
	getAllReferences,
	getUsedNamesInScopeInfo,
	isCommonJsConcatenationEnabled,
	renameIdentifiers
};
