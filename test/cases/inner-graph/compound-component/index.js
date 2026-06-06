import Form from "./form";
import { ns as formNs } from "./formNamespace";
import { formItemUsed } from "./FormItem";
import { formListUsed } from "./FormList";
import { useFormUsed } from "./useForm";
import { errorListUsed } from "./ErrorList";
import { Menu } from "./menu";
import { menuItemUsed } from "./MenuItem";
import { subMenuUsed } from "./SubMenu";
import { menuDividerUsed } from "./MenuDivider";
import { Form as ReForm, Menu as ReMenu } from "./barrel";
import { logger } from "./logger";
import { logUsed } from "./log";
import { infoUsed } from "./info";
import { warnUsed } from "./warn";
import Table from "./table";
import { columnUsed } from "./Column";
import { columnGroupUsed } from "./ColumnGroup";
import { SelectFull } from "./selectWithOptGroup";
import { optionUsed } from "./Option";
import { purePanelUsed } from "./PurePanel";
import { secretPanelUsed } from "./SecretPanel";

it("should tree-shake unused Form sub-components (export default)", () => {
	const Item = Form.Item;
	expect(Item()).toBe("FormItem");
	if (process.env.NODE_ENV === "production") {
		expect(formItemUsed).toBe(true);
		expect(formListUsed).toBe(false);
		expect(useFormUsed).toBe(false);
		expect(errorListUsed).toBe(false);
	}
});

it("should tree-shake unused Menu sub-components (export { Menu })", () => {
	const Item = Menu.Item;
	expect(Item()).toBe("MenuItem");
	if (process.env.NODE_ENV === "production") {
		expect(menuItemUsed).toBe(true);
		expect(subMenuUsed).toBe(false);
		// menuDividerUsed is true because re-export test below uses ReMenu.Divider
		expect(menuDividerUsed).toBe(true);
	}
});

it("should tree-shake through re-export barrel", () => {
	const Item = ReForm.Item;
	expect(Item()).toBe("FormItem");
	const Divider = ReMenu.Divider;
	expect(Divider()).toBe("MenuDivider");
});

it("should tree-shake unused logger methods (real-world logger pattern)", () => {
	const fn = logger.warn;
	expect(fn()).toBe("warn");
	if (process.env.NODE_ENV === "production") {
		expect(warnUsed).toBe(true);
		expect(logUsed).toBe(false);
		expect(infoUsed).toBe(false);
	}
});

it("should tree-shake through import * as ns (two-level nesting)", () => {
	const Item = formNs.default.Item;
	expect(Item()).toBe("FormItem");
	if (process.env.NODE_ENV === "production") {
		expect(formItemUsed).toBe(true);
		expect(formListUsed).toBe(false);
		expect(useFormUsed).toBe(false);
		expect(errorListUsed).toBe(false);
	}
});

it("should NOT optimize Table when same module has dynamic property access", () => {
	// Table module has console.log(Table[key]) — makes Table unconditionally used
	// All sub-components must be preserved
	const Col = Table.Column;
	expect(Col()).toBe("Column");
	if (process.env.NODE_ENV === "production") {
		expect(columnUsed).toBe(true);
		expect(columnGroupUsed).toBe(true);
	}
});

it("should NOT optimize upstream module when downstream uses whole object", () => {
	// select.js: Select.Option, Select.OptGroup, Select.PurePanel
	// selectWithOptGroup.js: const SelectFull = Select; SelectFull.SecretPanel = SecretPanel;
	// Consumer only uses SelectFull.Option
	const Opt = SelectFull.Option;
	expect(Opt()).toBe("Option");
	if (process.env.NODE_ENV === "production") {
		// Option is accessed by consumer
		expect(optionUsed).toBe(true);
		// PurePanel is NOT accessed, but must be preserved because
		// select.js's Select is Used (not OnlyPropertiesUsed) — downstream took the whole object
		expect(purePanelUsed).toBe(true);
		// SecretPanel is NOT accessed, and it's selectWithOptGroup.js's own property
		// selectWithOptGroup.js CAN optimize it away
		expect(secretPanelUsed).toBe(false);
	}
});
