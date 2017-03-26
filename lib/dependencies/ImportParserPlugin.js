/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportContextDependency = require("./ImportContextDependency");
const ImportDependenciesBlock = require("./ImportDependenciesBlock");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");

class ImportParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;
		let parsedComments, chunkNameAssignment;

		parser.plugin("program", (ast, comments) => {
			parsedComments = comments;
		});

		// use /* webpackChunkName = "chunkName" */ to specify a chunkName
		parser.plugin("evaluate AssignmentExpression", (assignment) => {
			if(assignment.left.name === "webpackChunkName") {
				chunkNameAssignment = assignment;
			}
		});

		parser.plugin(["call System.import", "import-call"], (expr) => {
			if(expr.arguments.length !== 1)
				throw new Error("Incorrect number of arguments provided to 'import(module: string) -> Promise'.");

			const param = parser.evaluateExpression(expr.arguments[0]);
			const exprEndPos = expr.end;
			const paramEndPos = expr.arguments[0].end;
			let chunkName = null;

			//check chunkName from comments
			if(parsedComments.length && exprEndPos - paramEndPos > "/*webpackChunkName=*/".length) {
				for(let i = 0; i < parsedComments.length; i++) {
					let comment = parsedComments[i];
					// should match the location and length
					if(comment.type === "Block" && comment.start >= paramEndPos && comment.end < exprEndPos) {
						chunkNameAssignment = null;
						parser.evaluate(comment.value);
						// expect an AssignmentExpression after evaluate
						if(chunkNameAssignment) {
							const chunkNameExpr = parser.evaluateExpression(chunkNameAssignment.right);
							if(chunkNameExpr.isString()) {
								chunkName = chunkNameExpr.string;
							} else {
								throw new Error(`\`webpackChunkName\` expected a String, but received: ${comment.value} .`);
							}
						}
						break;
					}
				}
			}

			if(param.isString()) {
				const depBlock = new ImportDependenciesBlock(param.string, expr.range, chunkName, parser.state.module, expr.loc);
				parser.state.current.addBlock(depBlock);
				return true;
			} else {
				const dep = ContextDependencyHelpers.create(ImportContextDependency, expr.range, param, expr, options, chunkName);
				if(!dep) return;
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
	}
}
module.exports = ImportParserPlugin;
