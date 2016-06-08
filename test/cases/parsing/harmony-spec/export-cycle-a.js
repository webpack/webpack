function fun() {
	return true;
};

import { callFun } from "./export-cycle-b";

export default callFun();

export { fun };
