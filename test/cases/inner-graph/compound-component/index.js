import Input from "./input";
import { ns as inputNs } from "./inputNamespace";
import { searchUsed } from "./Search";
import { passwordUsed } from "./Password";
import { textAreaUsed } from "./TextArea";
import { otpUsed } from "./OTP";
import { groupUsed } from "./Group";
import { getBumpCount } from "./sideEffectBump";
import { Menu } from "./menu";
import { menuItemUsed } from "./MenuItem";
import { subMenuUsed } from "./SubMenu";
import { menuDividerUsed } from "./MenuDivider";
import { Input as ReInput, Menu as ReMenu } from "./barrel";
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
import { red } from "./colors";

it("should tree-shake unused Input sub-components (export default)", () => {
	const Search = Input.Search;
	expect(Search()).toBe("Search");
	if (process.env.NODE_ENV === "production") {
		expect(searchUsed).toBe(true);
		expect(passwordUsed).toBe(false);
		expect(textAreaUsed).toBe(false);
		expect(otpUsed).toBe(false);
		expect(groupUsed).toBe(false);
		// Impure Input.setup = bump() must run (export still live)
		expect(getBumpCount()).toBe(1);
		expect(Input.setup).toBe("setup");
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
	const Search = ReInput.Search;
	expect(Search()).toBe("Search");
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
	const Search = inputNs.default.Search;
	expect(Search()).toBe("Search");
	if (process.env.NODE_ENV === "production") {
		expect(searchUsed).toBe(true);
		expect(passwordUsed).toBe(false);
		expect(textAreaUsed).toBe(false);
		expect(otpUsed).toBe(false);
		expect(groupUsed).toBe(false);
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

it("should not crash on unused palette export with .primary mutation", () => {
	// Mirrors @ant-design/colors: `const x = [...]; x.primary = x[5]`
	// Using only `red` must still evaluate the module (redDark shaken safely).
	expect(red.primary).toBe("#f5222d");
});
