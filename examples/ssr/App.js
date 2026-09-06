import React, { Suspense } from "react";

// The shell both builds render: the server with the route module already
// imported, the browser with a lazy one it still has to fetch.
export function App({ Page }) {
	return (
		<div className="app">
			<h1 className="title">webpack server-side rendering</h1>
			<Suspense fallback={<p className="pending">Loading the route…</p>}>
				<Page />
			</Suspense>
		</div>
	);
}
