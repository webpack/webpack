import React from "react";
import "./page.css";

export default function Page() {
	return (
		<article className="route">
			<h2 className="route-title">A code-split route</h2>
			<p className="route-body">
				This markup was rendered on the server. Its stylesheet lives in the
				route&apos;s own chunk, so the browser only learns about it once that
				chunk arrives — unless the server says so first.
			</p>
		</article>
	);
}
