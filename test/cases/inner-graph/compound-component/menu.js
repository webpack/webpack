// export { Menu } pattern (named export, not default)
import { InternalMenu } from "./InternalMenu";
import { MenuItem } from "./MenuItem";
import { SubMenu } from "./SubMenu";
import { MenuDivider } from "./MenuDivider";

const Menu = InternalMenu;
Menu.Item = MenuItem;
Menu.SubMenu = SubMenu;
Menu.Divider = MenuDivider;

export { Menu };
