// Library entry:
// - Form is re-exported → all sub-components must be preserved
// - Table is only used internally via .Column → ColumnGroup should be tree-shaken
import Table from "./table";
import Form from "./form";

export { Form };

export function renderColumn() {
	const Col = Table.Column;
	return Col();
}

it("should preserve all Form sub-components when re-exported by library", () => {
	// Form is re-exported — all sub-components must be preserved
	expect(Form.Item()).toBe("FormItem");
	expect(Form.List()).toBe("FormList");
});

it("should tree-shake unused Table sub-components used only internally", () => {
	// Table is NOT re-exported, only .Column is used internally
	expect(renderColumn()).toBe("Column");
});
