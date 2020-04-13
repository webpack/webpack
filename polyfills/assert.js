// from https://github.com/ionic-team/rollup-plugin-node-polyfills/blob/master/polyfills/assert.js

export default function assert(value, message) {
	if (!value) fail(value, true, message, "==", ok);
}

export function fail(actual, expected, message, operator, stackStartFunction) {
	throw new AssertionError({
		message: message,
		actual: actual,
		expected: expected,
		operator: operator,
		stackStartFunction: stackStartFunction
	});
}

export function AssertionError(options) {
	this.name = "AssertionError";
	this.actual = options.actual;
	this.expected = options.expected;
	this.operator = options.operator;
	if (options.message) {
		this.message = options.message;
		this.generatedMessage = false;
	} /* FIXME else {
		this.message = getMessage(this);
		this.generatedMessage = true;
	}*/
	var stackStartFunction = options.stackStartFunction || fail;
	if (Error.captureStackTrace) {
		Error.captureStackTrace(this, stackStartFunction);
	} /* FIXME else {
      // non v8 browsers so we can have a stacktrace
      var err = new Error();
      if (err.stack) {
        var out = err.stack;
  
        // try to strip useless frames
        var fn_name = getName(stackStartFunction);
        var idx = out.indexOf('\n' + fn_name);
        if (idx >= 0) {
          // once we have located the function frame
          // we need to strip out everything before it (and its line)
          var next_line = out.indexOf('\n', idx + 1);
          out = out.substring(next_line + 1);
        }
  
        this.stack = out;
      }
    }*/
}

export function ok(value, message) {
	if (!value) fail(value, true, message, "==", ok);
}
