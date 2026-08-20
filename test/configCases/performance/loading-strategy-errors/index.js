import vendor from "vendor-lib";
import { shared } from "./shared";

it("should raise every loading-strategy hint as an error", () =>
	import(
		/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "lazy" */ "./lazy"
	).then(({ default: lazy }) => {
		expect(vendor).toBe("vendor");
		expect(shared).toBe("shared");
		expect(lazy).toBe("lazy");
	}));
