import * as style from "./style.module.css";
import { local1, local2, local3, local4, ident } from "./style.module.css";

export default {
	global: style.global,
	class: style.class,
	local: `${local1} ${local2} ${local3} ${local4}`,
	local2: `${style.local5} ${style.local6}`,
	nested: `${style.nested1} ${style.nested2} ${style.nested3}`,
	notWmultiParams: `${style.local7}`,
	isWmultiParams: `${style.local8}`,
	matchesWmultiParams: `${style.local9}`,
	whereWmultiParams: `${style.local10}`,
	hasWmultiParams: `${style.local11}`,
	currentWmultiParams: `${style.local12}`,
	pastWmultiParams: `${style.local13}`,
	futureWmultiParams: `${style.local14}`,
	mozAnyWmultiParams: `${style.local15}`,
	webkitAnyWmultiParams: `${style.local16}`,
	ident,
	keyframes: style.localkeyframes,
	keyframesUPPERCASE: style.localkeyframesUPPERCASE,
	localkeyframes2UPPPERCASE: style.localkeyframes2UPPPERCASE,
	animation: style.animation,
	vars: `${style["local-color"]} ${style.vars} ${style["global-color"]} ${style.globalVars}`,
	media: style.wideScreenClass,
	mediaWithOperator: style.narrowScreenClass,
	supports: style.displayGridInSupports,
	supportsWithOperator: style.floatRightInNegativeSupports,
	mediaInSupports: style.displayFlexInMediaInSupports,
	supportsInMedia: style.displayFlexInSupportsInMedia,
	displayFlexInSupportsInMediaUpperCase:
		style.displayFlexInSupportsInMediaUpperCase,
	VARS: `${style["LOCAL-COLOR"]} ${style.VARS} ${style["GLOBAL-COLOR"]} ${style.globalVarsUpperCase}`,
	layer: style.layer
};
