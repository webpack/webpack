"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").javascript.JavascriptParser} JavascriptParser */

const PLUGIN_NAME = "statement-path";

/**
 * Records the statements an ESTree `statement` tap reads, and those a
 * `{ path: true }` one reads once the program is walked by id: the same
 * statements, nested ones included, but for those in a function expression,
 * which is walked as its ESTree object until expressions are walked by id.
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
			/** @type {Map<string, { top: number, estree: number[], path: number[] }>} */
			const seen = new Map();
			let switchOn = false;
			/**
			 * @param {JavascriptParser} parser the parser
			 * @returns {void}
			 */
			const onParser = (parser) => {
				/**
				 * @returns {{ top: number, estree: number[], path: number[] }} the module's record
				 */
				const record = () => {
					const { resource } = parser.state.module;
					let entry = seen.get(resource);
					if (entry === undefined) {
						seen.set(resource, (entry = { top: 0, estree: [], path: [] }));
					}
					return entry;
				};
				let tappedPath = false;
				// a label tap returning true leaves the labeled statement unwalked
				parser.hooks.label.for("skipped").tap(PLUGIN_NAME, () => true);
				parser.hooks.statement.tap(PLUGIN_NAME, (statement) => {
					record().estree.push(typeIds[statement.type]);
				});
				// the switch is turned on after this plugin taps, so the path tap waits for it
				parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
					record().top = ast.body.length;
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
				for (const [resource, { top, estree, path }] of seen) {
					if (!/\.js$/.test(resource)) continue;
					// every module here nests a statement in another
					expect(estree.length).toBeGreaterThan(top);
					if (switchOn) {
						// here only the `it` callback's statements, last, go unread by id
						expect(path.length).toBeGreaterThan(top);
						expect(path).toEqual(estree.slice(0, path.length));
					}
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
