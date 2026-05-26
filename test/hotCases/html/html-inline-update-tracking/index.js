import "./page.html";

it("should report the HTML module + the removed inline data-URI modules when inline <style> / <script> change", (done) => {
	NEXT((err) => {
		if (err) return done(err);
		// Drive `module.hot.check` directly so we can inspect the updated
		// modules list. Inline `<style>` and `<script>` bodies are encoded
		// as base64 `data:text/css;base64,…` / `data:text/javascript;base64,…`
		// virtual modules; when the body changes the data-URI identifier changes
		// too, so the OLD data-URI module is *removed* from the graph and
		// a NEW one (with the new identifier) takes its place. `hot.check`
		// reports both the HTML module (updated) and the OLD data-URI
		// modules (removed) as part of the changeset — the NEW data-URI
		// modules aren't in the changeset because they hadn't been loaded
		// yet at the previous evaluation.
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
				// Exactly those three modules: HTML + old-inline-script +
				// old-inline-style. Nothing else is in the changeset because
				// the new data-URI modules hadn't been loaded at the previous
				// evaluation — they're added on demand.
				expect(ids).toHaveLength(3);
				done();
			})
			.catch(done);
	});
});
