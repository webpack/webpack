import latin1 from "data:text/css;base64,YXtjb250ZW50OiLpIn0=";
import utf8 from "data:text/css;base64,YXtjb250ZW50OiLDqSJ9";

it("should keep bytes that are not UTF-8 when a hook is offered the payload", () => {
	expect(latin1).toBe("data:text/css;base64,YXtjb250ZW50OiLpIn0=");
	expect(utf8).toBe("data:text/css;base64,YXtjb250ZW50OiLDqSJ9");
});
