"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const files = fs.readdirSync(options.output.path);
		const read = (file) =>
			fs.readFileSync(path.join(options.output.path, file), "utf8");
		const code = read("bundle0.js");
		expect(code).toContain('expect(["b",');
		expect(code).toMatch(/"x!","\$\{ beep \}"\]/);
		expect(code).toContain("var[first,second=2]=source");
		expect(code).toContain("{known,renamed:other,given=4}=empty");
		expect(code).toContain("[kept=/*! keep */void 0]");
		expect(code).toContain("function length(parameter=void 0)");
		expect(code).toContain("method(parameter=void 0)");
		// `-1` and `1.5` name no index and no built-in, reading `undefined` too.
		expect(code).toContain(
			'expect(["undefined",3,void 0,void 0,void 0,void 0,[track("hole"),,2][1]'
		);
		expect(code).toContain('[track("hole"),,2][1]');
		expect(code).toContain(
			'var pattern=/a/,fn="function",object="object",runs=[track("made")]&&"runs",unset={size:1}.size'
		);
		expect(code).toContain(
			"return[!0,!0,!0,delete(0,object.p),delete(flag?object.p:2)"
		);
		expect(code).toContain("var first,named,last,rest,key;return");
		expect(code).not.toContain("unread");
		expect(code).toContain("if(0)var withFunction;");
		expect(code).toContain('flag.push("kept");var picked;');
		expect(code).toContain('flag.push("else");else var fromElse;');
		expect(code).toContain("var commented}");
		expect(code).toContain("try{for(;;)step()}");
		expect(code).toContain("try{for(;;)step(),step()}");
		expect(code).toContain("if(count)for(;;){if(step())step()}else step()");
		expect(code).toContain("for(;;){count++;if(count>0)break}");
		expect(code).toContain(
			'function neverCalled(){for(;;);do{track("loop")}while(/*! kept */1)}'
		);
		expect(code).toContain(
			'found:{log.push("before");log.push("one");if(done)break found;log.push("two")}if(done){log.push("bare");if(log.length)log.push("again")}log.push("try");'
		);
		const chunk = files.find(
			(file) => file !== "bundle0.js" && file.endsWith(".js")
		);
		expect(read(/** @type {string} */ (chunk))).toContain(
			'function pick(log){log.push("kept");return log}'
		);
	}
};
