"use strict";

// cspell:ignore jridgewell

/**
 * terser's node classes under the names webpack gives them as well as their
 * own: `AST_Node` is webpack's `SyntaxNode`, `AST_Call` its `CallNode`, and
 * `AST_Token` its `ParsedToken`, with the `isCallNode` predicates webpack reads.
 * @param {EXPECTED_ANY} ast terser's `ast.js`
 * @returns {EXPECTED_ANY} it, reading under either name
 */
const webpackNames = (ast) => {
	const named = { ...ast };
	for (const name of Object.keys(ast)) {
		if (!name.startsWith("AST_")) continue;
		const type = name.slice(4);
		const Type = ast[name];
		if (type === "Token") {
			named.ParsedToken = Type;
			continue;
		}
		const className = type === "Node" ? "SyntaxNode" : `${type}Node`;
		// webpack's factories are called, where terser's classes are constructed.
		/**
		 * @param {EXPECTED_ANY} props the node's properties
		 * @returns {EXPECTED_ANY} terser's node
		 */
		function factory(props) {
			return new Type(props);
		}
		factory.prototype = Type.prototype;
		named[className] = factory;
		named[`is${className}`] = (/** @type {unknown} */ value) =>
			value instanceof Type;
	}
	return named;
};

/**
 * terser's own modules, which its published entry point does not expose: the
 * reference the printer's tests compare webpack's ports with.
 * @param {(specifier: string) => Promise<EXPECTED_ANY>} importModule the calling test's own `import()`, bound to its runtime
 * @returns {Promise<import("../../lib/javascript/syntax-printer").MinifierModules>} the modules, by what they hold
 */
const loadTerserSources = async (importModule) => {
	const path = require("path");
	const { pathToFileURL } = require("url");
	const { createRequire } = require("module");

	const directory = path.dirname(require.resolve("terser/package.json"));
	/**
	 * @param {string} file a file in terser's `lib`
	 * @returns {Promise<EXPECTED_ANY>} the module
	 */
	const at = (file) =>
		importModule(pathToFileURL(path.join(directory, "lib", file)).href);
	// One at a time: asking for several at once leaves a module loader linking a
	// module that another import is still reading.
	const ast = await at("ast.js");
	// Read for its effect: it installs `transform` on every node class.
	await at("transform.js");
	const scope = await at("scope.js");
	const parse = await at("parse.js");
	const output = await at("output.js");
	const utils = await at("utils/index.js");
	// Read for its effect: it installs the ESTree conversions.
	await at("mozilla-ast.js");
	const { minify } = await at("minify.js");
	const compress = await at("compress/index.js");
	const domprops = await at("../tools/domprops.js");
	const common = await at("compress/common.js");
	const inference = await at("compress/inference.js");
	const flags = await at("compress/compressor-flags.js");
	const nativeObjects = await at("compress/native-objects.js");
	const sourceMap = createRequire(path.join(directory, "package.json"))(
		"@jridgewell/source-map"
	);
	return {
		// webpack's own factories read a node class by the name webpack gives it,
		// so terser's classes answer to both here: a test hands these modules to
		// one of those factories to hold it to terser's own behaviour.
		ast: webpackNames(ast),
		scope,
		parse,
		output,
		utils,
		minify,
		compress,
		domprops,
		common,
		inference,
		flags,
		nativeObjects,
		sourceMap,
		version: require("terser/package.json").version
	};
};

/**
 * The message a comparison with terser reads off what was thrown. An engine's
 * own `TypeError` reads as its name, since JavaScriptCore quotes the failing expression.
 * @param {EXPECTED_ANY} error what was thrown
 * @returns {string} what to compare
 */
const thrownMessage = (error) =>
	error && error.name === "TypeError"
		? "TypeError"
		: String(error && error.message);

/**
 * The class terser holds a node of one of webpack's classes as: a leaf class
 * terser has none for, which ESTree types apart, names the class it extends.
 * @param {string} type the class's `TYPE`
 * @returns {string} terser's class's `TYPE`
 */
const terserTypeOf = (type) => {
	const { ESTREE_LEAF_CLASSES } = require("../../tooling/generate-js-data");

	return Object.prototype.hasOwnProperty.call(ESTREE_LEAF_CLASSES, type)
		? terserTypeOf(ESTREE_LEAF_CLASSES[type])
		: type;
};

/** @type {EXPECTED_ANY} */
let ownAst;

/**
 * The class of a node of terser's tree, or the kind, terser's class, of a
 * node of webpack's, which holds it as data read by `kindOf`.
 * @param {EXPECTED_ANY} node a node of either tree
 * @returns {string} the class
 */
const kindName = (node) => {
	if (node.TYPE !== undefined) return node.TYPE;
	if (ownAst === undefined) {
		ownAst = require("../../lib/javascript/syntax-printer").createAst();
	}
	return ownAst.kindOf(node);
};

module.exports = { kindName, loadTerserSources, terserTypeOf, thrownMessage };
