// pulls the css module into the require() target's closure, so wrap
// propagation reaches it
import * as styles from "./style.module.css";

export const foo = styles.foo;
