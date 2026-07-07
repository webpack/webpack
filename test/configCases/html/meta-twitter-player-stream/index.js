import page from "./page.html";

it("should resolve the twitter:player:stream meta content as an asset", () => {
	expect(page).not.toContain('content="./video.mp4"');
	expect(page).toMatch(
		/<meta name="twitter:player:stream" content="[0-9a-f]+\.mp4">/
	);
	// A non-asset twitter meta stays untouched.
	expect(page).toContain('<meta name="twitter:card" content="player">');
	expect(page).toMatchSnapshot();
});
