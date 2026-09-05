import vendor from "vendor-lib";
import { shared } from "./shared";

it("should keep every loading-strategy hint out of warnings and errors", () =>
	import(
		/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "lazy" */ "./lazy"
	).then(({ default: lazy }) => {
		expect(vendor).toBe("vendor");
		expect(shared).toBe("shared");
		expect(lazy).toBe("lazy");
		expect(__STATS__.hints.map((hint) => hint.message).sort()).toEqual([
			expect.stringMatching(/conflicting resource hints/),
			expect.stringMatching(/duplicate modules/),
			expect.stringMatching(/split chunks capped/),
			expect.stringMatching(/unsplit vendors/)
		]);
		expect(__STATS__.warnings).toHaveLength(0);
		expect(__STATS__.errors).toHaveLength(0);
	}));
