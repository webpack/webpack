import "./styles.css";
import componentStyles from "./component.module.css";

it("should handle CSS HMR with ESM output", (done) => {
	// CSS modules return an object with class names
	expect(typeof componentStyles).toBe("object");
	expect(typeof componentStyles.component).toBe("string");
	
	// Create test elements
	const container = document.createElement("div");
	container.className = "container";
	container.textContent = "Test Container";
	
	const component = document.createElement("div");
	component.className = componentStyles.component;
	component.textContent = "Test Component";
	
	document.body.appendChild(container);
	document.body.appendChild(component);
	
	// Check initial styles
	const containerStyles = getComputedStyle(container);
	expect(containerStyles.backgroundColor).toBe("rgb(240, 240, 240)");
	
	// Accept CSS updates
	module.hot.accept("./styles.css");
	module.hot.accept("./component.module.css");
	
	NEXT(require("../../update")(done, true, () => {
		// After HMR update, styles should be updated
		const updatedContainerStyles = getComputedStyle(container);
		expect(updatedContainerStyles.backgroundColor).toBe("rgb(230, 230, 230)");
		
		// Clean up
		document.body.removeChild(container);
		document.body.removeChild(component);
		done();
	}));
});

it("should support CSS modules with ESM output", () => {
	// Test that CSS modules work correctly
	expect(componentStyles).toBeDefined();
	expect(Object.keys(componentStyles).length).toBeGreaterThan(0);
});
