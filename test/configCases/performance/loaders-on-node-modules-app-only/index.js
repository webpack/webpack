import m1 from "./m1";
import m2 from "./m2";
import m3 from "./m3";
import m4 from "./m4";
import m5 from "./m5";
import m6 from "./m6";
import m7 from "./m7";
import m8 from "./m8";
import m9 from "./m9";
import m10 from "./m10";
import m11 from "./m11";
it("should not count application modules the loader ran on", () => {
	expect(0 + m1 + m2 + m3 + m4 + m5 + m6 + m7 + m8 + m9 + m10 + m11).toBe(66);
	expect(__STATS__.warnings).toHaveLength(0);
});
