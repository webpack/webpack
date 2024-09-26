import * as styles from './style.module.css';
import * as styles1 from './module.js';

it("should not deadlock when using importModule", () => {
	expect(styles.someBottom).toBe("8px");
	expect(styles1.someBottom).toBe("8px");
});
