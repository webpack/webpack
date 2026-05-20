import "./page.html";

it("should leave the HTML module's runtime with no module-level update when only external resources change", (done) => {
	NEXT((err) => {
		if (err) return done(err);
		// `<script src="./external.js">` and `<link rel="stylesheet"
		// href="./style.css">` become their own entry chunks with
		// content-stable, named chunk filenames (`__html_<hash>_<idx>`).
		// They run in their own webpack runtimes (the script src entry
		// owns its chunk's runtime; the stylesheet entry produces a CSS
		// chunk). When their bodies change:
		//   - the HTML module's runtime (the main entry, which `import`s
		//     `./page.html`) sees no module-level update — its array is
		//     truthy-but-empty because the HTML's rewritten output didn't
		//     change (the same chunk URL resolves the new content for
		//     free).
		//   - the external chunks each emit their own hot-update bundles
		//     (`__html_<hash>_0.<hash>.hot-update.js` for the script src,
		//     `__html_<hash>_1.<hash>.hot-update.json` for the
		//     stylesheet) that the browser fetches when it reloads those
		//     entries.
		module.hot
			.check(true)
			.then((updatedModules) => {
				expect(updatedModules).toBeTruthy();
				const ids = updatedModules.map((id) => String(id));
				// HTML module did NOT change — only the external resources
				// did, and they don't live in this runtime.
				expect(ids).not.toContain("./page.html");
				expect(ids).toHaveLength(0);
				done();
			})
			.catch(done);
	});
});
