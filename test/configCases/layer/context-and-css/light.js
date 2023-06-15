require.context('./test1', true, /\.less$/);
require('./test2/shared.less');

it("should contain only white", function() {
	const style = getComputedStyle(document.body);

	expect(style.color).toBe(" white");
	expect(style.background).toBe(" white");
});
