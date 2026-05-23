import { a, b } from "dep";

// pure export default expression: statementPurePart path
export default /*#__PURE__*/ a();

// pure declarator, independent usage
export const other = /*#__PURE__*/ b();
