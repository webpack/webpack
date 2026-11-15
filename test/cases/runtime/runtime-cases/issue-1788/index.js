import { atest, btest } from "./a";

it("issue-1788: should have the correct values", function() {
	atest();
	btest();
});
