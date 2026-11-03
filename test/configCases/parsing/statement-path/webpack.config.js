"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").javascript.JavascriptParser} JavascriptParser */

const PLUGIN_NAME = "statement-path";

/**
 * Records the top-level statements, and those a `{ path: true }` `statement`
 * tap reads once the program is walked by id: the id walk reaches the top
 * level so far, each statement below it still walked as its ESTree object.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const statementPath = (compiler) => {
	const { NodeType } = compiler.webpack.javascript.syntax.parser;
	/** @type {Record<string, number>} */
	const typeIds = { ...NodeType };
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			/** @type {Map<string, { estree: number[], path: number[] }>} */
			const seen = new Map();
			let switchOn = false;
			/**
			 * @param {JavascriptParser} parser the parser
			 * @returns {void}
			 */
			const onParser = (parser) => {
				/**
				 * @returns {{ estree: number[], path: number[] }} the module's record
				 */
				const record = () => {
					const { resource } = parser.state.module;
					let entry = seen.get(resource);
					if (entry === undefined) {
						seen.set(resource, (entry = { estree: [], path: [] }));
					}
					return entry;
				};
				let tappedPath = false;
				// the switch is turned on after this plugin taps, so the path tap waits for it
				parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
					for (const statement of ast.body) {
						record().estree.push(typeIds[statement.type]);
					}
					if (
						tappedPath ||
						!(/** @type {{ _walkPath?: boolean }} */ (parser)._walkPath)
					) {
						return;
					}
					tappedPath = true;
					switchOn = true;
					parser.hooks.statement.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, statement) => {
							expect(typeof statement).toBe("number");
							record().path.push(path.type(statement));
						}
					);
				});
			};
			for (const type of /** @type {const} */ ([
				"javascript/auto",
				"javascript/dynamic",
				"javascript/esm"
			])) {
				normalModuleFactory.hooks.parser.for(type).tap(PLUGIN_NAME, onParser);
			}
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				let walkedById = 0;
				for (const [resource, { estree, path }] of seen) {
					if (!/\.js$/.test(resource)) continue;
					expect(estree.length).toBeGreaterThan(0);
					if (switchOn) expect(path).toEqual(estree);
					if (path.length > 0) walkedById++;
				}
				// under the switch the path tap reads at least one module
				expect(walkedById > 0).toBe(switchOn);
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [statementPath]
};
