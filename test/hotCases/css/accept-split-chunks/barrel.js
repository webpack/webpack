export { helper } from "./helper.js";
export { unusedFn } from "./unused.js";

import * as styles from "./style.module.css";

module.hot.accept(["./style.module.css", "./style2.module.css"], () => {
	void styles;
});
