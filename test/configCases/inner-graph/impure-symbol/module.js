import { pureCall, impureCall, classPureCall, classImpureCall } from "dep";

// pure class declaration: dropped when unused
export class PureClass {
	method() {
		classPureCall();
	}
}

// impure class declaration (side effect in extends): always kept
export class ImpureClass extends classImpureCall() {}

// pure declarator: dropped when unused
export const usedPureConst = /*#__PURE__*/ pureCall();

// impure declarator: always kept
export const impureConst = impureCall();
