/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("../javascript/JavascriptParser.js").DestructuringAssignmentProperties} DestructuringAssignmentProperties */
/** @typedef {import("../javascript/JavascriptParser.js").DestructuringAssignmentProperty} DestructuringAssignmentProperty */

/**
 * Deep first traverse the properties of a destructuring assignment.
 * @param {DestructuringAssignmentProperties} properties destructuring assignment properties
 * @param {((stack: DestructuringAssignmentProperty[]) => void) | undefined=} onLeftNode on left node callback
 * @param {((stack: DestructuringAssignmentProperty[]) => void) | undefined=} enterNode enter node callback
 * @param {((stack: DestructuringAssignmentProperty[]) => void) | undefined=} exitNode exit node callback
 * @param {DestructuringAssignmentProperty[] | undefined=} stack stack of the walking nodes
 */
function traverseDestructuringAssignmentProperties(
	properties,
	onLeftNode,
	enterNode,
	exitNode,
	stack = []
) {
	for (const property of properties) {
		stack.push(property);
		if (enterNode) enterNode(stack);
		if (property.pattern) {
			traverseDestructuringAssignmentProperties(
				property.pattern,
				onLeftNode,
				enterNode,
				exitNode,
				stack
			);
		} else if (onLeftNode) {
			onLeftNode(stack);
		}
		if (exitNode) exitNode(stack);
		stack.pop();
	}
}

export default traverseDestructuringAssignmentProperties;

export { traverseDestructuringAssignmentProperties as "module.exports" };
