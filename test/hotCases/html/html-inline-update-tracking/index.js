import "./page.html";

it("should report the HTML module + the removed inline data-URI modules when inline <style> / <script> change", (done) => {
	NEXT((err) => {
		if (err) return done(err);
		// Drive `module.hot.check` directly to inspect the updated modules list. Inline
		// bodies are base64 data-URI virtual modules, so a changed body changes the
		// identifier: the old module is removed and a new one takes its place.
		module.hot
			.check(true)
			.then((updatedModules) => {
				expect(updatedModules).toBeTruthy();
				const ids = updatedModules.map((id) => String(id));
				expect(ids).toContain("./page.html");
				// The OLD inline-script data URI (base64-encoded body).
				expect(
					ids.some((id) => id.startsWith("data:text/javascript;base64,"))
				).toBe(true);
				// The OLD inline-style data URI. Only the old one is in the
				// changeset (the new data-URI modules weren't loaded yet), so a
				// prefix check uniquely identifies it without decoding base64.
				expect(
					ids.some((id) => id.startsWith("data:text/css;base64,"))
				).toBe(true);
				// Exactly those three: HTML plus the old inline script and style. The new data-URI
				// modules are not in the changeset because they had not been loaded at the
				// previous evaluation.
				expect(ids).toHaveLength(3);
				done();
			})
			.catch(done);
	});
});
