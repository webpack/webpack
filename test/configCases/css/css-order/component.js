// First
import { dependency } from "./dependency";
// Second
import * as styles from "./component.css";

export function component() {
	return dependency() && styles !== undefined;
}
