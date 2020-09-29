import React from "react";
import ComponentB from "mfe-b/Component"; // <- these are remote modules,
import ComponentC from "mfe-c/Component"; // <- but they are used as usual packages
import { de } from "date-fns/locale";

// remote modules can also be used with import() which lazy loads them as usual
const ComponentD = React.lazy(() => import("mfe-c/Component2"));

const App = () => (
	<article>
		<header>
			<h1>Hello World</h1>
		</header>
		<p>This component is from a remote container:</p>
		<ComponentB locale={de} />
		<p>And this component is from another remote container:</p>
		<ComponentC locale={de} />
		<React.Suspense fallback={<p>Lazy loading component...</p>}>
			<p>
				And this component is from this remote container too, but lazy loaded:
			</p>
			<ComponentD />
		</React.Suspense>
	</article>
);
export default App;
