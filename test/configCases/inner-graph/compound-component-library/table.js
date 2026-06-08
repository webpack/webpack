// Compound component — NOT re-exported by library entry, only used internally
import { InternalTable } from "./InternalTable";
import { Column } from "./Column";
import { ColumnGroup } from "./ColumnGroup";

const Table = InternalTable;
Table.Column = Column;
Table.ColumnGroup = ColumnGroup;

export default Table;
