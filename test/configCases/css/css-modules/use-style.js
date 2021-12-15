import * as style from "./style.module.css";
import { local1, local2, local3, local4 } from "./style.module.css";

export default {
	global: style.global,
	class: style.class,
	local: `${local1} ${local2} ${local3} ${local4}`,
	local2: `${style.local5} ${style.local6}`,
	nested: `${style.nested1} ${style.nested2} ${style.nested3}`
};
