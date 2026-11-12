/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { Field, NodeType } = require("../../javascript/syntax").parser;

/** @import { JavascriptNodeReader } from "../../javascript/JavascriptParser" */

/** @typedef {{ fn: number, expressions: number[], needThis: boolean | undefined }} FunctionNodeResult */

/**
 * `getFunctionExpression` for a node read by id: the function a callback
 * argument holds, with the expressions to walk beside it.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} node the callback argument
 * @returns {FunctionNodeResult | undefined} the function and what else to walk
 */
module.exports = (path, node) => {
	const type = path.type(node);
	// <FunctionExpression>
	if (
		type === NodeType.FunctionExpression ||
		type === NodeType.ArrowFunctionExpression
	) {
		return { fn: node, expressions: [], needThis: false };
	}
	if (type !== NodeType.CallExpression) return;
	const callee = path.field(0, Field.callee, node);
	const calleeType = path.type(callee);
	const argumentCount = path.fieldCount(Field.arguments, node);
	const first = path.field(0, Field.arguments, node);
	// <FunctionExpression>.bind(<Expression>)
	if (calleeType === NodeType.MemberExpression) {
		const object = path.field(0, Field.object, callee);
		const property = path.field(0, Field.property, callee);
		if (
			path.type(object) === NodeType.FunctionExpression &&
			path.type(property) === NodeType.Identifier &&
			path.name(property) === "bind" &&
			argumentCount === 1
		) {
			return { fn: object, expressions: [first], needThis: undefined };
		}
		return;
	}
	// (function(_this) {return <FunctionExpression>})(this) (Coffeescript)
	if (
		calleeType !== NodeType.FunctionExpression ||
		argumentCount !== 1 ||
		path.type(first) !== NodeType.ThisExpression
	) {
		return;
	}
	const body = path.field(0, Field.body, callee);
	if (
		path.type(body) !== NodeType.BlockStatement ||
		path.fieldCount(Field.body, body) !== 1
	) {
		return;
	}
	const statement = path.field(0, Field.body, body);
	if (path.type(statement) !== NodeType.ReturnStatement) return;
	const argument = path.field(0, Field.argument, statement);
	if (argument !== 0 && path.type(argument) === NodeType.FunctionExpression) {
		return { fn: argument, expressions: [], needThis: true };
	}
};
