const value = require("./value");

it("runs the loader chain in a worker", () => {
	expect(value).toBe(
		"worker:42:true:loaded:string:true:style_abc:abc:ASNFZ4mrze8BI0VniavN7w==:ASNFZ4mr:ASNFZ4mrze8BI0VniavN7w=="
	);
});
