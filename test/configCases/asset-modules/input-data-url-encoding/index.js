it("should keep original encoding", () => {
	const url = new URL(
		"data:image/svg+xml;p=1;q=2,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke=\"%23343a40\" stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e",
		import.meta.url
	);
	expect(url.href).toBe(
		"data:image/svg+xml;p=1;q=2,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke=\"%23343a40\" stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e"
	);
});

it("should work with 'image/svg+xml'", () => {
	const one = new URL(
		"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxNiAxNic+PHBhdGggZmlsbD0nbm9uZScgc3Ryb2tlPScjMzQzYTQwJyBzdHJva2UtbGluZWNhcD0ncm91bmQnIHN0cm9rZS1saW5lam9pbj0ncm91bmQnIHN0cm9rZS13aWR0aD0nMicgZD0nTTIgNWw2IDYgNi02Jy8+PC9zdmc+",
		import.meta.url
	);
	expect(one.href).toBe(
		"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2016%2016%27%3E%3Cpath%20fill%3D%27none%27%20stroke%3D%27%23343a40%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M2%205l6%206%206-6%27%2F%3E%3C%2Fsvg%3E"
	);
	const two = new URL(
		"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzQzYTQwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTIgNWw2IDYgNi02Ii8+PC9zdmc+",
		import.meta.url
	);
	expect(two.href).toBe(
		"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23343a40%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M2%205l6%206%206-6%22%2F%3E%3C%2Fsvg%3E"
	);
	const three = new URL(
		"data:IMAGE/SVG+XML;param=123;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxNyAxNyc+PHBhdGggZmlsbD0nbm9uZScgc3Ryb2tlPScjMzQzYTQwJyBzdHJva2UtbGluZWNhcD0ncm91bmQnIHN0cm9rZS1saW5lam9pbj0ncm91bmQnIHN0cm9rZS13aWR0aD0nMicgZD0nTTIgNWw2IDYgNi02Jy8+PC9zdmc+",
		import.meta.url
	);
	expect(three.href).toBe(
		"data:IMAGE/SVG+XML;param=123,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2017%2017%27%3E%3Cpath%20fill%3D%27none%27%20stroke%3D%27%23343a40%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M2%205l6%206%206-6%27%2F%3E%3C%2Fsvg%3E"
	);
});
