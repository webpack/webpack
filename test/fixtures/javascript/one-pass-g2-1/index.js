function f(body) {
	if (a) return { body };
	if (b) return { "body": body };
	if (c) return { body: body };
}
function g(body) {
	if (a) return { body };
	if (b) return { body() {} };
}
