import m0 from "./src/m0";
import m1 from "./src/m1";
import m2 from "./src/m2";
import m3 from "./src/m3";
import m4 from "./src/m4";
import m5 from "./src/m5";

it("should name a loader that holds the main thread", () => {
	expect([m0, m1, m2, m3, m4, m5]).toHaveLength(6);
});
