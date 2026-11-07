import * as styles from "./style.module.css";

it("resolves composes chains transitively at any depth", () => {
	expect({ ...styles }).toEqual({
		d: "d",
		c: "c d",
		b: "b c d",
		a: "a b c d",
		e: "e z y x w"
	});
});
