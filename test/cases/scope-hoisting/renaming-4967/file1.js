export function a() {
	return "ok";
}

export function test() {
	function file1_js_a() {
		return "fail";
	}
	return a();
}
