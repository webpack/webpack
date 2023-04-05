import { hostTest } from "./host";
import { hostHelper } from "./hostHelper";
import container from "./container";
import { hostHelper as hostHelperMF } from "hostContainer/hostHelper";

export function test() {
	expect(hostTest).toBe("test");
	expect(hostHelper).toBe("this is a helper");
	expect(container).toBe("TEST this is a helper");
	expect(hostHelperMF).toBe("this is a helper");
}
