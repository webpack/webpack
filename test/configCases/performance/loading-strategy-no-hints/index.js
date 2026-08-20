import vendor from "vendor-lib";
import { shared } from "./shared";

it("should report only the configuration mistake while size hints are off", () =>
	import(
		/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "lazy" */ "./lazy"
	).then(({ default: lazy }) => {
		expect(vendor).toBe("vendor");
		expect(shared).toBe("shared");
		expect(lazy).toBe("lazy");
	}));
