import "./page.html";

it("should leave the HTML module's runtime with no module-level update when only external resources change", (done) => {
	NEXT((err) => {
		if (err) return done(err);
		// `<script src>` and `<link rel="stylesheet">` become their own entry chunks with
		// content-stable names and their own runtimes. When their bodies change the HTML
		// module's runtime sees no update, but each chunk emits its own hot-update bundle.
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
