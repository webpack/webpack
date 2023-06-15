it("should contain only black", function() {
	require.context('./test1', true, /\.less$/);
	require('./test2/shared.less');
	/*const style = getComputedStyle(document.body);

	expect(style.color).toBe(" black");
	expect(style.background).toBe(" black");*/
});
