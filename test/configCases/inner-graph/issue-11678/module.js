import { ResizeObserver as RO } from "resize-observer";
import * as employeeData from "Source_Data/employee";
import * as servicesData from "Source_Data/services";
import * as SplitViewPage from "Source_Framework/splitview/page";
import * as SplitViewMenu from "Source_Framework/splitview/menu";
import {
	TC as pageTC,
	getDeleteDialogText
} from "Source_Framework/splitview/text";
import * as UiListPicker from "Source_Framework/uilistpicker/UiListPicker";
import { CookieStorage } from "Source_ODS/cookiestorage";
import { removeTextEditor } from "Source_Framework/uirichtextedit";
import { UiElementCheckbox, UiElementRadio } from "Source_Framework/uielement";
import { switchButtonIcon } from "Source_ODS/UiButton/icon";
import { setButtonText } from "Source_ODS/UiButton/text";
import { replacePage } from "Source_Framework/pagelinks";
import { getSession } from "Source_ODS/ods";
import { UiButton, UiSelectButton } from "Source_ODS/UiButton";
import { buttonClasses } from "Source_Framework/defaultButtons";
import { UiForm } from "Source_Framework/uiform";
import * as Breadcrumb from "Source_Framework/breadcrumb";
import * as _ from "Source_ODS/lodash";
import { DomElement } from "Source_ODS/DomElement";
import { getUrlParameter, setUrlParameter } from "Source_ODS/url";
import { addFixedTooltip } from "Source_ODS/tooltip";
import { showLoadingWarning, showWarningDialog } from "Source_ODS/ui";
import { checkIsNonemptyObject, isString, isUndefined } from "Source_ODS/types";
import { UiDialog, confirmDialog } from "Source_ODS/UiDialog";
import { ModuleNameEnum } from "Source_Framework/common/moduleDispatcher";
import { showEmployeeAssignDialog } from "Source_Framework/common/employeeassignment";
import { buttonPdfPreview } from "Source_Framework/common/pdf_preview";
import { createTaskProgress } from "Source_Framework/common/taskprogress";
import { CALLBACK_EVENTS } from "Source_Framework/uitable";
import {
	getFilterPara,
	saveUniversalTableLayout,
	loadDefaultLayout,
	saveDefaultLayoutForAgency
} from "Source_Framework/backend/universalData";
import { selectColumns } from "Source_Framework/common/columnsDialog";
import { STATUS } from "Source_Framework/backend/jsonData";
import {
	buttonStatusChange,
	HeaderDataEnum
} from "Source_Framework/common/statuschange";
import { genericJobSelectionDialog } from "Source_Framework/common/las_mod_jobselection";
import { TC } from "./text";
import { BEC } from "./bec";
import { POSITIONTYPES } from "./positionTypes";
import { SETTINGS } from "./settings";
import * as preferences from "./preferences";
import * as privileges from "./privileges";
import * as buttons from "./buttons";
import * as form from "./form";
import * as formHelper from "./formHelper";
import { createTableWidget, createTableWidgetForManualSort } from "./table";
import { setTechnicalTextButton } from "./techText";
import { openDialogForNewPositionSi } from "./addPositionToSi";
import { buttonInsertService, insertServiceDialog } from "./ciPosFromJob";
import { shiftPosition } from "./shiftPosition";
import { autoSumsDialog } from "./autoSums";
import { defineLayoutDialog } from "./defineLayout";
import { buttonInsertFromTemplate, setInsertData } from "./insertFromTemplate";
import { buttonMove, movePosition } from "./movePosition";
import {
	buttonCopySelect,
	duplicatePosition,
	copyPosition,
	buttonCopyFromOrderToJob,
	copyFromOrderToJob
} from "./copy";
import { convertData } from "./save";
import { buttonCreateOrder, onCreateOrder } from "./createOrder";
import {
	buttonConnectOrderPos,
	buttonCopyJobToOrderPos,
	jobToOrderPos
} from "./orderPosFromJobPos";
import { showNchInfoDialog } from "./nchInfoDialog";
import { urlGotoSiFromJobService } from "Source_Modules/las_mod_siheader/url";
import { TITLE as SITITLE } from "Source_Modules/las_mod_siheader/bec";
import { TITLE as CETITLE } from "Source_Modules/las_mod_ceheader/bec";
import { TITLE as ORDERTITLE } from "Source_Modules/las_mod_order/bec";
import { TITLE as CITITLE } from "Source_Modules/las_mod_ciheader/bec";

const _positionSettings = {
		parent: {
			settings: {},
			headerStatus: ""
		},
		settings: {
			[SETTINGS.CREATEABLE]: false,
			[SETTINGS.DELETABLE]: false
		}
	},
	_tableOverlayClass = ".tableintableoverlay",
	_tableOverlayOffsetLeft = 7,
	_showTableInElement = ".tablecont",
	_pluginObj = {};
const resizeObserverInstance = new RO(entries => {
	entries.forEach(entry => {
		const parentWidth = entry.contentRect.width;
		const parentheight = entry.contentRect.height;
		const newWidth = parentWidth - _tableOverlayOffsetLeft + 6;
		const newHeight = parentheight;
		const overlayElement = $(_tableOverlayClass);
		overlayElement.css({ width: newWidth, height: newHeight });
		overlayElement.find("#positiontable").css({
			width: newWidth - 2,
			height:
				parentheight -
				overlayElement.find(".title").getHeight() -
				_tableOverlayOffsetLeft
		});
	});
});
let _options;
let _parentModuleSettings,
	_parentTableSelection,
	_parentTableDataId;
let _isFormInDialog = false,
	_isFormInDialogSelector = null,
	_isFormInDialogJobPK = null;
let _staticData,
	_generalDataEmplLists,
	_tableObject,
	_tableData,
	_tableSelectionPosNo = null,
	_tableSelectionJobNo = null,
	_tableContainerId = "",
	_previousTableTitle = "",
	_formIdName,
	_formObject,
	_formData,
	_formEvent,
	_isNewDataset = false,
	progressbar,
	addedBreadcrumbId;
let _tableLayoutInfo = {
	moduleName: "",
	privAllAgencies: false,
	privSaveGlobally: false
};
let _reloadTable;
let prevRows = null;
let triggerSelectionChangeEvent = true;
async function onReloadTable() {
	await _updateTableContent();
}
async function onExport() {
	await _tableObject.toExcel();
}
async function onConnectPosition() {
	const hPk = getPKfromModule();
	const ok = await openDialogForNewPositionSi(
		{ siBookId: hPk.idSiBook, siHeaderId: hPk.siHeaderId },
		_staticData
	);
	if (ok) {
		await _updateTableContent();
	}
}
async function onSortPosition() {
	await getSortDialog();
}
async function onSortManual() {
	const isManualSort = _tableObject.isSortColumnAvailable();
	const { canBeModified = true } = _positionSettings.parent.settings;
	const configuration = _tableObject.getConfiguration();
	const { columns } = configuration;
	if (isManualSort) {
		_tableObject.clearFilter();
	}
	await doCreateAndShowTableWidget(
		columns,
		_getModuleName(),
		canBeModified,
		!isManualSort
	);
}
function showSortManualButtonState() {
	const isManualSort = _tableObject.isSortColumnAvailable();
	const className = "." + buttons.CLASSNAME.sortManual;
	if (isManualSort) {
		switchButtonIcon(className, "btn-img-sortManual", "btn-img-sortPrint");
		setButtonText(className, TC.printSort);
	} else {
		switchButtonIcon(className, "btn-img-sortPrint", "btn-img-sortManual");
		setButtonText(className, TC.manualSort);
	}
}
function onGoToSi() {
	const selection = _tableObject.getSelection();
	if (selection.length > 0) {
		const hPk = getPKfromModule();
		replacePage(
			urlGotoSiFromJobService({
				jobId: hPk.jobid,
				posNos: _getListofSelectedRow()
			})
		);
	} else {
		showLoadingWarning(TC.selectionEmpty);
	}
}
async function onShiftPosition(state) {
	const pk = getPKFromSelection();
	if (pk !== null) {
		const ok = await shiftPosition(state, pk);
		if (ok) {
			await _updateTableContent();
		}
	} else {
		showLoadingWarning(TC.selectionEmpty);
	}
}
async function onInsertFromTemplateDialog() {
	if (_parentTableSelection) {
		await setInsertData(_getModuleName(), _parentTableSelection);
		await _updateTableContent();
	}
}
async function onCopy(toTargetModule = null) {
	if (_parentTableSelection) {
		const refresh = await copyPosition(
			_getModuleName(),
			_parentTableSelection,
			_staticData,
			_getListofSelectedRow(),
			toTargetModule
		);
		if (refresh) {
			await _updateTableContent();
		}
	}
}
async function onCopyToJob() {
	await onCopy(ModuleNameEnum.JOB);
}
async function onCopyToCe() {
	await onCopy(ModuleNameEnum.CEHEADER);
}
async function onDuplicate() {
	if (_parentTableSelection) {
		const refresh = duplicatePosition(
			_getModuleName(),
			_parentTableSelection,
			_getListofSelectedRow()
		);
		if (refresh) {
			await _updateTableContent();
		}
	}
}
function onCopyList() {
	return [
		...(_getModuleName() === ModuleNameEnum.JOB
			? [
					{
						rowId: "duplicateInJob",
						rowText: TC.duplicateInJob,
						rowListener: onDuplicate
					}
			  ]
			: []),
		{
			rowId: "copyToOtherJob",
			rowText: TC.copyToOtherJob,
			rowListener: onCopyToJob
		},
		{ rowId: "copyToCe", rowText: TC.copyToCe, rowListener: onCopyToCe }
	];
}
async function onCopyFromOrderToJob() {
	if (_parentTableSelection) {
		const id = _parentTableSelection.orde_orderid;
		await copyFromOrderToJob(id, _staticData, _getListofSelectedRow());
		await _updateTableContent();
	}
}
async function onMove() {
	if (_parentTableSelection) {
		const id = _parentTableSelection.job_jobid;
		const ok = await movePosition(
			_getModuleName(),
			id,
			1,
			1,
			_parentTableSelection,
			_getListofSelectedRow(),
			_staticData
		);
		if (ok) {
			await _updateTableContent();
		}
	}
}
async function onDefineLayout() {
	const pk = getPKFromSelection();
	if (pk !== null) {
		const ok = await defineLayoutDialog(pk);
		if (ok) {
			await _updateTableContent();
		}
	}
}
async function onJobToOrderPos(withMultipleSelection) {
	const hPk = getPKfromModule();
	await jobToOrderPos(
		hPk.orderId,
		_tableObject.getSelection(),
		withMultipleSelection
	);
	await _updateTableContent();
}
function onStatusChange() {
	const selection = _tableObject.getSelection();
	const hPk = getPKfromModule();
	return {
		idSiBook: hPk.idSiBook,
		siHeaderId: hPk.siHeaderId,
		theJobID: selection.map(obj => obj.jpos_jobid),
		thePosNo: selection.map(obj => obj.jpos_posno),
		theHeaderType: selection.map(obj => obj.jpos_headertype),
		theSubPosNo: selection.map(obj => obj.jpos_subposno),
		multiple: selection.length > 1
	};
}
async function onAutoSums() {
	if (_parentTableSelection) {
		await autoSumsDialog(
			_getModuleName(),
			_parentTableSelection,
			_staticData.lists.listPosTypesAutoSum
		);
		await _updateTableContent();
	}
}
async function onInsertService() {
	const hPk = getPKfromModule();
	const data = {
		ciBookId: hPk.ciBookId,
		ciHeaderId: hPk.ciHeaderId
	};
	const ok = await insertServiceDialog(data);
	if (ok) {
		await _updateTableContent();
	}
}
function _buttonConnectPosition(callback) {
	return new UiButton(
		TC.connectSIPosButtonText,
		buttons.CLASSNAME.siConnectPosition,
		callback,
		"btn-img-connectSIPos"
	);
}
function _buttonSortPosition(callback) {
	return new UiButton(
		TC.automaticSort,
		buttons.CLASSNAME.sortPosition,
		callback,
		"btn-img-sortPos"
	);
}
function _buttonSortManual(callback) {
	return new UiButton(
		TC.manualSort,
		buttons.CLASSNAME.sortManual,
		callback,
		"btn-img-sortManual"
	);
}
function gotoList() {
	return [{ rowId: "gotoSi", rowText: SITITLE, rowListener: onGoToSi }];
}
function _buttonShiftUpPosition(callback) {
	return new UiButton(
		TC.hierarchyUp,
		buttons.CLASSNAME.shiftUpPosition,
		callback,
		"btn-img-shiftUpPos"
	);
}
function _buttonShiftDownPosition(callback) {
	return new UiButton(
		TC.hierarchyDown,
		buttons.CLASSNAME.shiftDownPosition,
		callback,
		"btn-img-shiftDownPos"
	);
}
function _buttonDefineLayout(callback) {
	return new UiButton(
		TC.setLayout,
		buttons.CLASSNAME.defineLayout,
		callback,
		"btn-img-defineLayoutPos"
	);
}
function _buttonAutoSums(callback) {
	return new UiButton(
		TC.generateTotals,
		buttons.CLASSNAME.autoSums,
		callback,
		"btn-img-createsubtotals"
	);
}
async function markPositions(data) {
	_tableObject.clearRowAttributes();
	if (data !== null && data.jpos_postype === POSITIONTYPES.SUBTOTAL) {
		const para = {
			theJobID: data.jpos_jobid,
			theHeaderType: data.jpos_headertype,
			thePosNo: data.jpos_posno,
			theSubPosNo: data.jpos_subposno
		};
		const subtotals = await servicesData.getPositionsInSubtotal(para);
		if (subtotals !== null) {
			const filter = subtotals.map(posno => ({ jpos_posno: posno }));
			_tableObject.setRowAttributes(filter, { backgroundColor: "aquamarine" });
		}
	}
}
function markPositionsTypeText(data) {
	_tableObject.clearRowSelectionColor();
	if (data !== null && data.jpos_postype === POSITIONTYPES.TEXT) {
		const filter = [
			{
				jpos_posno: data.jpos_posno
			}
		];
		_tableObject.setRowSelectionColor(filter, "lavender");
	}
}
async function _createToolbarTable(setEvent) {
	const data = _getDataFromSelectedEntry();
	const toolbar = new SplitViewMenu.Toolbar("table");
	console.log("_createToolbarTable(", setEvent, ")");
	switch (setEvent) {

		case buttons.STATE.initialize:
			switch (_getModuleName()) {
				case ModuleNameEnum.JOB:
					toolbar.add(_buttonSortPosition(onSortPosition));
					if (
						privileges.getPrivilege(
							_staticData,
							privileges.PRIVILEGE.CREATEFROMTEMPL
						)
					) {
						toolbar.add(buttonInsertFromTemplate(onInsertFromTemplateDialog));
					}
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY) &&
						getSelectionCount() > 0
					) {
						toolbar.add(_buttonDefineLayout(onDefineLayout));
					}
					toolbar.add(_buttonSortManual(onSortManual), "right");
					break;
				case ModuleNameEnum.SIHEADER:

					if (
						privileges.getPrivilege(
							_staticData,
							privileges.PRIVILEGE.SICONNECTPOSITION
						) &&
						_positionSettings.settings[SETTINGS.CREATEABLE]
					) {
						toolbar.add(_buttonConnectPosition(onConnectPosition));
					}
					toolbar.add(_buttonSortManual(onSortManual), "right");
					break;
				case ModuleNameEnum.CEHEADER:
					toolbar.add(_buttonSortPosition(onSortPosition));
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY) &&
						getSelectionCount() > 0
					) {
						toolbar.add(_buttonDefineLayout(onDefineLayout));
					}
					if (
						privileges.getPrivilege(
							_staticData,
							privileges.PRIVILEGE.CREATEFROMTEMPL
						)
					) {
						toolbar.add(buttonInsertFromTemplate(onInsertFromTemplateDialog));
					}
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.AUTOSUMS)
					) {
						toolbar.add(_buttonAutoSums(onAutoSums));
					}
					toolbar.addSpacer();
					toolbar.add(
						buttonPdfPreview(ModuleNameEnum.CEHEADER, {
							cehe_ceid: getPKfromModule().ceId
						})
					);
					toolbar.add(_buttonSortManual(onSortManual), "right");
					break;
				case ModuleNameEnum.ORDER:
					if (
						privileges.getPrivilege(
							_staticData,
							privileges.PRIVILEGE.COPYORDERPOS
						) &&
						_positionSettings.settings[SETTINGS.CREATEABLE]
					) {
						toolbar.add(
							buttonCopyJobToOrderPos(onJobToOrderPos.bind(this, true))
						);
					}
					toolbar.addSpacer();
					toolbar.add(
						buttonPdfPreview(ModuleNameEnum.ORDER, {
							orde_orderid: getPKfromModule().orderId
						})
					);
					toolbar.add(_buttonSortManual(onSortManual), "right");
					break;
				case ModuleNameEnum.CIHEADER:
					{
						const s = {
							canBeCreated:
								_positionSettings.settings[SETTINGS.CREATEABLE] || false
						};
						if (s.canBeCreated) {
							if (
								privileges.getPrivilege(
									_staticData,
									privileges.PRIVILEGE.MODIFY
								)
							) {
								toolbar.add(_buttonSortPosition(onSortPosition));
							}
							if (
								privileges.getPrivilege(
									_staticData,
									privileges.PRIVILEGE.CREATE
								)
							) {
								toolbar.add(buttonInsertService(onInsertService));
							}
							if (
								privileges.getPrivilege(
									_staticData,
									privileges.PRIVILEGE.MODIFY
								)
							) {
								toolbar.add(_buttonAutoSums(onAutoSums));
							}
						}
						toolbar.addSpacer();
						toolbar.add(
							buttonPdfPreview(ModuleNameEnum.CIHEADER, {
								cihe_bookid: getPKfromModule().ciBookId,
								cihe_ciheaderid: getPKfromModule().ciHeaderId
							})
						);
						toolbar.add(_buttonSortManual(onSortManual), "right");
					}
					break;
				default:
					break;
			}
			break;

		case buttons.STATE.jobPositionTableMenu:
			toolbar.add(_buttonSortPosition(onSortPosition));
			toolbar.add(_buttonShiftUpPosition(onShiftPosition.bind(this, 0)));
			toolbar.add(_buttonShiftDownPosition(onShiftPosition.bind(this, 1)));
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.CREATEFROMTEMPL
				)
			) {
				toolbar.add(buttonInsertFromTemplate(onInsertFromTemplateDialog));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.COPYPOS)) {
				toolbar.add(buttonCopySelect(onCopyList()));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MOVEPOS)) {
				toolbar.add(buttonMove(onMove));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)) {
				toolbar.add(_buttonDefineLayout(onDefineLayout));
			}
			if (
				privileges.getPrivilege(_staticData, privileges.PRIVILEGE.CREATEORDER)
			) {
				const selectedIds = _.map(_tableObject.getSelection(), "jpos_postype");

				if (
					_.includes(selectedIds, POSITIONTYPES.EXTERNAL) ||
					_.includes(selectedIds, POSITIONTYPES.MEDIA)
				) {
					const hPk = getPKfromModule();
					toolbar.add(
						buttonCreateOrder(
							onCreateOrder.bind(this, _getListofSelectedRow(), [hPk.jobid])
						)
					);
				}
			}

			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.SIMODULE)) {

				if (_tableObject.getOptions().multipleSelection) {
					const selectedIds = _.map(
						_tableObject.getSelection(),
						"jpos_postype"
					);

					if (
						_.includes(selectedIds, POSITIONTYPES.EXTERNAL) ||
						_.includes(selectedIds, POSITIONTYPES.MEDIA)
					) {
						toolbar.addDefaultGoto(gotoList());
					}
				} else {
					if (
						data !== null &&
						(data.jpos_postype === POSITIONTYPES.EXTERNAL ||
							data.jpos_postype === POSITIONTYPES.MEDIA)
					) {
						toolbar.addDefaultGoto(gotoList());
					}
				}
			}
			toolbar.add(_buttonSortManual(onSortManual), "right");
			await markPositions(data);
			markPositionsTypeText(data);
			break;
		case buttons.STATE.jobPositionTableMenuMultiple:
			toolbar.add(_buttonSortPosition(onSortPosition));
			toolbar.add(_buttonShiftUpPosition(onShiftPosition.bind(this, 0)));
			toolbar.add(_buttonShiftDownPosition(onShiftPosition.bind(this, 1)));
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.CREATEFROMTEMPL
				)
			) {
				toolbar.add(buttonInsertFromTemplate(onInsertFromTemplateDialog));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.COPYPOS)) {
				toolbar.add(buttonCopySelect(onCopyList()));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MOVEPOS)) {
				toolbar.add(buttonMove(onMove));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)) {
				toolbar.add(_buttonDefineLayout(onDefineLayout));
			}
			if (
				privileges.getPrivilege(_staticData, privileges.PRIVILEGE.CREATEORDER)
			) {
				const selectedIds = _.map(_tableObject.getSelection(), "jpos_postype");
				if (
					_.includes(selectedIds, POSITIONTYPES.EXTERNAL) ||
					_.includes(selectedIds, POSITIONTYPES.MEDIA)
				) {
					const hPk = getPKfromModule();
					toolbar.add(
						buttonCreateOrder(
							onCreateOrder.bind(this, _getListofSelectedRow(), [hPk.jobid])
						)
					);
				}
			}
			toolbar.add(_buttonSortManual(onSortManual), "right");
			break;

		case buttons.STATE.siPositionTableMenu:
			toolbar.add(
				buttonStatusChange(HeaderDataEnum.SIPOS, onStatusChange, onReloadTable)
			);

			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.SICONNECTPOSITION
				) &&
				_positionSettings.settings[SETTINGS.CREATEABLE]
			) {
				toolbar.add(_buttonConnectPosition(onConnectPosition));
			}
			toolbar.add(_buttonSortManual(onSortManual), "right");
			break;
		case buttons.STATE.siPositionTableMenuMultiple:
			toolbar.add(
				buttonStatusChange(HeaderDataEnum.SIPOS, onStatusChange, onReloadTable)
			);
			toolbar.add(_buttonSortManual(onSortManual), "right");
			break;

		case buttons.STATE.cePositionTableMenu:
		case buttons.STATE.cePositionTableMenuMultiple:
			toolbar.add(_buttonSortPosition(onSortPosition));
			toolbar.add(_buttonShiftUpPosition(onShiftPosition.bind(this, 0)));
			toolbar.add(_buttonShiftDownPosition(onShiftPosition.bind(this, 1)));
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.CREATEFROMTEMPL
				)
			) {
				toolbar.add(buttonInsertFromTemplate(onInsertFromTemplateDialog));
			}
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.COPYPOS)) {

				toolbar.add(buttonCopySelect(onCopyList()));
			}
			if (
				privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY) &&
				getSelectionCount() > 0
			) {
				toolbar.add(_buttonDefineLayout(onDefineLayout));
			}
			if (
				privileges.getPrivilege(_staticData, privileges.PRIVILEGE.AUTOSUMS) &&
				getSelectionCount() > 0
			) {
				toolbar.add(_buttonAutoSums(onAutoSums));
			}
			toolbar.addSpacer();
			toolbar.add(
				buttonPdfPreview(ModuleNameEnum.CEHEADER, {
					cehe_ceid: getPKfromModule().ceId
				})
			);
			toolbar.add(_buttonSortManual(onSortManual), "right");
			await markPositions(data);
			markPositionsTypeText(data);
			break;

		case buttons.STATE.orderPositionTableMenu:
			toolbar.add(_buttonShiftUpPosition(onShiftPosition.bind(this, 0)));
			toolbar.add(_buttonShiftDownPosition(onShiftPosition.bind(this, 1)));
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)) {
				toolbar.add(_buttonDefineLayout(onDefineLayout));
			}
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.ORDERCOPYTOJOB
				)
			) {
				toolbar.add(buttonCopyFromOrderToJob(onCopyFromOrderToJob));
			}
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.CONNECTORDERPOS
				)
			) {
				toolbar.add(buttonConnectOrderPos(onJobToOrderPos.bind(this, false)));
			}
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.COPYORDERPOS
				) &&
				_positionSettings.settings[SETTINGS.CREATEABLE]
			) {
				toolbar.add(buttonCopyJobToOrderPos(onJobToOrderPos.bind(this, true)));
			}





			toolbar.addSpacer();
			toolbar.add(
				buttonPdfPreview(ModuleNameEnum.ORDER, {
					orde_orderid: getPKfromModule().orderId
				})
			);
			toolbar.add(_buttonSortManual(onSortManual), "right");
			break;
		case buttons.STATE.orderPositionTableMenuMultiple:
			if (privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)) {
				toolbar.add(_buttonDefineLayout(onDefineLayout));
			}
			if (
				privileges.getPrivilege(
					_staticData,
					privileges.PRIVILEGE.ORDERCOPYTOJOB
				)
			) {
				toolbar.add(buttonCopyFromOrderToJob(onCopyFromOrderToJob));
			}
			toolbar.addSpacer();
			toolbar.add(
				buttonPdfPreview(ModuleNameEnum.ORDER, {
					orde_orderid: getPKfromModule().orderId
				})
			);
			toolbar.add(_buttonSortManual(onSortManual), "right");
			break;

		case buttons.STATE.ciPositionTableMenu:
			{
				const s = {
					canBeCreated: _positionSettings.settings[SETTINGS.CREATEABLE] || false
				};
				if (s.canBeCreated) {
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)
					) {
						toolbar.add(_buttonSortPosition(onSortPosition));
						toolbar.add(_buttonShiftUpPosition(onShiftPosition.bind(this, 0)));
						toolbar.add(
							_buttonShiftDownPosition(onShiftPosition.bind(this, 1))
						);
					}
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.CREATE)
					) {
						toolbar.add(buttonInsertService(onInsertService));
					}
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)
					) {
						toolbar.add(_buttonDefineLayout(onDefineLayout));
						toolbar.add(_buttonAutoSums(onAutoSums));
					}
				}
				toolbar.addSpacer();
				toolbar.add(
					buttonPdfPreview(ModuleNameEnum.CIHEADER, {
						cihe_bookid: getPKfromModule().ciBookId,
						cihe_ciheaderid: getPKfromModule().ciHeaderId
					})
				);
				toolbar.add(_buttonSortManual(onSortManual), "right");
			}
			break;
		case buttons.STATE.ciPositionTableMenuMultiple:
			{
				const s = {
					canBeCreated: _positionSettings.settings[SETTINGS.CREATEABLE] || false
				};
				if (s.canBeCreated) {
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)
					) {
						toolbar.add(_buttonSortPosition(onSortPosition));
						toolbar.add(_buttonShiftUpPosition(onShiftPosition.bind(this, 0)));
						toolbar.add(
							_buttonShiftDownPosition(onShiftPosition.bind(this, 1))
						);
					}
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.CREATE)
					) {
						toolbar.add(buttonInsertService(onInsertService));
					}
					if (
						privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY)
					) {
						toolbar.add(_buttonDefineLayout(onDefineLayout));
						toolbar.add(_buttonAutoSums(onAutoSums));
					}
				}
				toolbar.addSpacer();
				toolbar.add(
					buttonPdfPreview(ModuleNameEnum.CIHEADER, {
						cihe_bookid: getPKfromModule().ciBookId,
						cihe_ciheaderid: getPKfromModule().ciHeaderId
					})
				);
				toolbar.add(_buttonSortManual(onSortManual), "right");
			}
			break;
		default:
			throw new Error('Invalid event "' + setEvent + '"');
	}
	const multipleSelection = _tableObject.getOptions().multipleSelection;
	const hasFilter = _tableObject.options.hasFilter;
	toolbar.addDefaultTableOptions(
		{
			selectAll: multipleSelection
				? () => {
						_tableObject.selectAll();
						if (_tableObject.eventHandler[CALLBACK_EVENTS.SELECTIONCHANGED]) {
							_tableObject.eventHandler[CALLBACK_EVENTS.SELECTIONCHANGED](
								_tableObject.getSelection()
							);
						}
				  }
				: null,
			clearAllFilters: hasFilter
				? () => {
						_tableObject.clearFilter();
				  }
				: null,
			selectColumns: async () => {
				if (_tableLayoutInfo.moduleName !== "") {
					const ok = await selectColumns(
						_tableLayoutInfo.moduleName,
						_tableObject
					);
					if (ok) {
						await onReloadTable();
					}
				}
			},
			adjustColumnSize: _tableObject.adjustColumnSize.bind(_tableObject),
			loadDefaultLayout: async () => {
				if (_tableLayoutInfo.moduleName !== "") {
					const ok = await loadDefaultLayout(_tableLayoutInfo.moduleName);
					if (ok) {
						await onReloadTable();
					}
				}
			},
			saveDefaultLayout: _tableLayoutInfo.privSaveGlobally
				? async () => {
						if (_tableLayoutInfo.moduleName !== "") {
							await saveDefaultLayoutForAgency(
								_tableLayoutInfo.moduleName,
								_tableObject.getConfiguration()
							);
						}
				  }
				: null,
			exportTable: onExport
		},
		"right"
	);
	toolbar.addDefaultReload(onReloadTable, "right");
	toolbar.render();
	showSortManualButtonState();
}
export async function getDataAndShowTable(
	name,
	parentTableSelection,
	parentSettings,
	reloadTable,
	serviceID
) {
	let getListPK;
	_reloadTable = reloadTable;
	_parentTableSelection = parentTableSelection;
	if (parentTableSelection === null) {
		throw new Error("No row selected");
	}
	setPKfromModule(parentTableSelection);
	removeTextEditor();
	switch (name) {
		case ModuleNameEnum.SIHEADER:
			{
				const hPk = getPKfromModule();
				getListPK = {
					theSIBookID: hPk.idSiBook,
					theSIHeaderID: hPk.siHeaderId
				};
			}
			break;
		case ModuleNameEnum.CEHEADER:
			{
				const hPk = getPKfromModule();
				getListPK = { theCEID: hPk.ceId };
			}
			break;
		case ModuleNameEnum.JOB:
			{
				const hPk = getPKfromModule();
				getListPK = { theJobID: hPk.jobid };
			}
			break;
		case ModuleNameEnum.ORDER:
			{
				const hPk = getPKfromModule();
				getListPK = { theOrderID: hPk.orderId };
			}
			break;
		case ModuleNameEnum.CIHEADER:
			{
				const hPk = getPKfromModule();
				getListPK = { ciBookId: hPk.ciBookId, ciHeaderId: hPk.ciHeaderId };
			}
			break;
		default:
			throw new Error(`Invalid name "${name}`);
	}
	let settingsData = {
		canBeCreated: true,
		canBeDeleted: true,
		headerStatus: "",
		showButtonDeleteAndMoveNCH: false
	};
	switch (name) {
		case ModuleNameEnum.SIHEADER:
		case ModuleNameEnum.JOB:
		case ModuleNameEnum.CEHEADER:
		case ModuleNameEnum.ORDER:
			settingsData = {
				...settingsData,
				...(await servicesData.getActionInfo(
					getPKfromModule(),
					_getModuleType()
				))
			};
			break;
		case ModuleNameEnum.CIHEADER:
			settingsData = await servicesData.getActionInfo(
				getPKfromModule(),
				_getModuleType()
			);
			break;
		default:
			break;
	}
	_positionSettings.settings[SETTINGS.CREATEABLE] = settingsData.canBeCreated;
	_positionSettings.settings[SETTINGS.DELETABLE] = settingsData.canBeDeleted;
	_positionSettings.settings[SETTINGS.MULTIPLEDELETE] =
		settingsData.showButtonDeleteAndMoveNCH;
	const tableData = await servicesData.getListOfPos(
		getListPK,
		_getModuleType(),
		1,
		1
	);
	if (tableData === null) {
		_showParentTable(false);
		return;
	}
	_tableData = {
		cols: tableData.cols,
		rows: tableData.rows
	};
	_tableLayoutInfo = tableData.info;
	_positionSettings.parent.headerStatus = settingsData.headerStatus;
	_positionSettings.parent.settings = parentSettings;
	const { canBeModified = true } = parentSettings;
	await doCreateAndShowTableWidget(tableData.head.columns, name, canBeModified);
	if (_isShowFormOnly()) {
		$(".overview").removeClass("notable");
		$(".menutableindetails").hide();
	}
	if (name === ModuleNameEnum.JOB) {

		const hPk = getPKfromModule();
		const serviceIDForLink = serviceID ? String(serviceID) : "";
		addedBreadcrumbId = await Breadcrumb.add(
			_staticData.settings.moduleTitle,
			`LAS_MOD_JOB_DLG.page?jobID=${hPk.jobid}&serviceID=${serviceIDForLink}`
		);
		if (serviceID) {

			_tableObject.setCurrentRow({
				jpos_posno: serviceID,
				jpos_jobid: hPk.jobid
			});

			const selectionLength = getSelectionCount();
			if (selectionLength === 1) {
				await _createToolbarTable(buttons.STATE.jobPositionTableMenu);
			} else if (selectionLength > 1) {
				await _createToolbarTable(buttons.STATE.jobPositionTableMenuMultiple);
			}

			await _showForm(buttons.STATE.show, _getDataFromSelectedEntry());
		}
	}
}
async function doCreateAndShowTableWidget(
	columns,
	name,
	canBeModified,
	isManualSort = false
) {
	if (_tableObject) {
		_tableObject.destructor();
		$(_tableOverlayClass)
			.find(".positiontablecontent")
			.html(`<div id="${_tableContainerId.replace("#", "")}"></div>`);
	}
	if (isManualSort) {
		_tableObject = createTableWidgetForManualSort(
			columns,
			_tableContainerId,
			name
		);
	} else {
		_tableObject = createTableWidget(
			columns,
			_tableContainerId,
			name,
			canBeModified || true
		);
	}
	await _showTableInTable();
	await _removeDetails();
}
function _addDOMElements() {
	let buttonTitle = TC.closeOverlayTableDefault;
	if (isString(_previousTableTitle)) {
		buttonTitle = TC.closeOverlayTable + _previousTableTitle;
	}
	$(_showTableInElement).append(`
        <div class="${_tableOverlayClass.replace(".", "")}">
            <div class="title">
                <div class="headline">
                    <span class="label1"></span>
                </div>
                <div class="headerstatus"></div>
            </div>
            <div class="positiontablecontent">
                <div id="${_tableContainerId.replace("#", "")}"></div>
            </div>
            <button class="close" type="button" title="${buttonTitle}"></button>
        </div>
    `);
}
function _isShowFormOnly() {
	return Number(getUrlParameter("theShowFormOnly")) === 1;
}
function _bindClickEvents() {
	$(document).on(
		"click",
		_tableOverlayClass + " button.close",
		async function () {
			const parent = $(this).closest(_showTableInElement),
				parentWidth = parent.width();

			if (_isShowFormOnly()) {
				$(".overview").addClass("notable");
				$(".menutableindetails").show();
			}
			$(document)
				.find(_tableOverlayClass)
				.animate({ left: "-" + parentWidth }, 200, function () {
					$(this).css({ visibility: "hidden" });
					$(this).removeAttr("style");
				});

			if (!isUndefined(addedBreadcrumbId)) {
				await Breadcrumb.remove(addedBreadcrumbId);
			}

			removeTextEditor();

			_showParentTable();
		}
	);
	const positionTableContainer = new DomElement(_showTableInElement, false);
	if (positionTableContainer.size() > 0) {
		resizeObserverInstance.observe(positionTableContainer.getDomElement());
	}
}
function _getParentDescription(name) {
	let text = "";
	if (_parentTableSelection) {
		switch (name) {
			case ModuleNameEnum.SIHEADER:
				{
					const hPk = getPKfromModule();
					text +=
						SITITLE +
						" " +
						hPk.idSiBook +
						'<span class="subtitle"> / ' +
						hPk.siHeaderId +
						"</small>";
				}
				break;
			case ModuleNameEnum.JOB:
				text +=
					_parentTableSelection.job_matchcode +
					' <span class="subtitle">(' +
					_parentTableSelection.job_intno +
					")</small>";
				break;
			case ModuleNameEnum.CEHEADER:
				text +=
					CETITLE +
					" " +
					_parentTableSelection.cehe_bookid +
					"/" +
					_parentTableSelection.cehe_headerid +
					" - Var. " +
					_parentTableSelection.cehe_variantid;
				break;
			case ModuleNameEnum.ORDER:
				text +=
					ORDERTITLE +
					" " +
					_parentTableSelection.orde_orderbookid +
					"/" +
					_parentTableSelection.orde_orderheaderid;
				break;
			case ModuleNameEnum.CIHEADER:
				text +=
					CITITLE +
					" " +
					_parentTableSelection.cihe_bookid +
					"/" +
					_parentTableSelection.cihe_ciheaderid;
				break;
			default:
				throw new Error('Invalid event "' + name + '"');
		}
	}
	return text;
}
async function onClickTable(selection, formState) {
	const selectionLength = selection.length;
	if (selectionLength === 0) {
		await _removeDetails();
	} else if (selectionLength === 1) {

		switch (_getModuleName()) {
			case ModuleNameEnum.SIHEADER:
				await _createToolbarTable(buttons.STATE.siPositionTableMenu);
				break;
			case ModuleNameEnum.JOB:
				await _createToolbarTable(buttons.STATE.jobPositionTableMenu);
				break;
			case ModuleNameEnum.CEHEADER:
				await _createToolbarTable(buttons.STATE.cePositionTableMenu);
				break;
			case ModuleNameEnum.ORDER:
				await _createToolbarTable(buttons.STATE.orderPositionTableMenu);
				break;
			case ModuleNameEnum.CIHEADER:
				await _createToolbarTable(buttons.STATE.ciPositionTableMenu);
				break;
			default:
				throw new Error('Invalid name "' + _getModuleName() + '"');
		}
		await _showForm(formState, _getDataFromSelectedEntry());
	} else if (selectionLength > 1) {
		switch (_getModuleName()) {
			case ModuleNameEnum.SIHEADER:
				await _removeDetails();
				_showFormButtons(buttons.STATE.multipleInitialize);
				await _createToolbarTable(buttons.STATE.siPositionTableMenuMultiple);
				break;
			case ModuleNameEnum.JOB:
				await _removeDetails();
				_showFormButtons(buttons.STATE.multipleInitialize);
				await _createToolbarTable(buttons.STATE.jobPositionTableMenuMultiple);
				break;
			case ModuleNameEnum.CEHEADER:
				await _removeDetails();
				_showFormButtons(buttons.STATE.multipleInitialize);
				await _createToolbarTable(buttons.STATE.cePositionTableMenuMultiple);
				break;
			case ModuleNameEnum.ORDER:
				await _removeDetails();
				_showFormButtons(buttons.STATE.multipleInitialize);
				await _createToolbarTable(buttons.STATE.orderPositionTableMenuMultiple);
				break;
			case ModuleNameEnum.CIHEADER:
				await _removeDetails();
				_showFormButtons(buttons.STATE.multipleInitialize);
				await _createToolbarTable(buttons.STATE.ciPositionTableMenuMultiple);
				break;
			default:
				throw new Error('Invalid name "' + _getModuleName() + '"');
		}
	}
}
async function _showTableInTable() {
	const tableOverlay = $(_tableOverlayClass);
	$(".form_wrapper").addClass("serviceslist");
	const parentTableWidth = $(_showTableInElement).getWidth();
	const parentTableHeight = $(_showTableInElement).getHeight();
	tableOverlay.css({ width: parentTableWidth, height: parentTableHeight });
	tableOverlay
		.find(".title span.label1")
		.html(_getParentDescription(_getModuleName()));
	if (_positionSettings.parent.headerStatus !== "") {
		tableOverlay
			.find(".title .headerstatus")
			.html(
				`<div class="metainfo headerstatus_inner">${TC.status}: <span class="label1">${_positionSettings.parent.headerStatus}</span></div>`
			);
	}
	tableOverlay.find(_tableContainerId).css({
		width: parentTableWidth - 2,
		height:
			parentTableHeight -
			tableOverlay.find(".title").getHeight() -
			_tableOverlayOffsetLeft
	});
	tableOverlay.css({ visibility: "visible" });
	await _createToolbarTable(buttons.STATE.initialize);
	_rerenderTable();
	_tableObject.on(CALLBACK_EVENTS.SELECTIONCHANGED, async currentRows => {

		console.log("currentRows", currentRows);

		const btnCancel = buttonClasses.cancel;
		if (
			!triggerSelectionChangeEvent &&
			prevRows !== null &&
			currentRows[0].jpos_posno === prevRows[0].jpos_posno
		) {
			return false;
		}

		if (_isButtonPresent(btnCancel)) {
			_getButtonSelectorObject(btnCancel).trigger("click");
		} else {
			prevRows = currentRows;
			await onClickTable(currentRows, buttons.STATE.show);
		}
		return false;
	});
	_tableObject.on(CALLBACK_EVENTS.LAYOUTCHANGED, tableConfig =>
		saveUniversalTableLayout(_tableLayoutInfo.moduleName, tableConfig)
	);
	_tableObject.on(CALLBACK_EVENTS.DRAG, (sourceRows, targetRows) =>
		moveTableRow(sourceRows, targetRows)
	);
	_tableObject.on(CALLBACK_EVENTS.FILTERCHANGED, async tableConfig => {

		console.log("FILTERCHANGED", tableConfig, _tableObject.getFilter());

		await onReloadTable();
	});
}
async function moveTableRow(sourceRows, targetRows) {
	const { canBeModified = true } = _positionSettings.parent.settings;
	if (canBeModified) {
		const para = {
			jobIds: sourceRows.map(el => el.jpos_jobid),
			posNos: sourceRows.map(el => el.jpos_posno),
			headerTypes: sourceRows.map(el => el.jpos_headertype),
			subPosNos: sourceRows.map(el => el.jpos_subposno),
			insertAfterPosNo: targetRows[0].jpos_posno,
			insertAfterJobId: targetRows[0].jpos_jobid,
			insertAfterHeaderType: targetRows[0].jpos_headertype,
			insertAfterSubPosNo: targetRows[0].jpos_subposno
		};
		const data = await servicesData.setReorderPos(para);
		if (data !== null) {
			await onReloadTable();
		}
	}
}
async function _updateTableContent() {
	const moduleName = _getModuleName();
	const filter = _tableObject.getFilter();
	const para = {
		...getFilterPara(filter)
	};
	switch (moduleName) {
		case ModuleNameEnum.SIHEADER:
			{
				const hPk = getPKfromModule();
				para.theSIBookID = hPk.idSiBook;
				para.theSIHeaderID = hPk.siHeaderId;
			}
			break;
		case ModuleNameEnum.JOB:
			{
				const hPk = getPKfromModule();
				para.theJobID = hPk.jobid;
			}
			break;
		case ModuleNameEnum.CEHEADER:
			{
				const hPk = getPKfromModule();
				para.theCEID = hPk.ceId;
			}
			break;
		case ModuleNameEnum.ORDER:
			{
				const hPk = getPKfromModule();
				para.theOrderID = hPk.orderId;
			}
			break;
		case ModuleNameEnum.CIHEADER:
			{
				const hPk = getPKfromModule();
				para.ciBookId = hPk.ciBookId;
				para.ciHeaderId = hPk.ciHeaderId;
			}
			break;
		default:
			throw new Error(`Invalid moduleName "${moduleName}"`);
	}
	para.theType = _getModuleType();
	const data = await servicesData.getListOfPos(para, _getModuleType(), 1, 1);
	if (data !== null) {

		_tableObject.setConfiguration({
			..._tableObject.getConfiguration(),
			columns: data.head.columns
		});

		_setTableData(data);

		_rerenderTable();

		if (_tableSelectionPosNo) {
			_tableObject.setSelection([{ jpos_posno: _tableSelectionPosNo }]);
			_tableObject.makeVisible();
		} else {
			await _removeDetails();
		}
	}
}
function _setTableData(obj) {
	_tableData.cols = obj.cols;
	_tableData.rows = obj.rows;
}
function _rerenderTable() {
	_tableObject.show(_tableData);
	if (getSession().userPreferences.autoAdjustColWidth) {
		_tableObject.adjustColumnSize();
	}
	SplitViewPage.setTableRowCounter(_tableData.rows.length);
}
async function _createFormWidget(positionTypeId, headerPK, contentId = null) {
	console.log(
		'Init form for module "' +
			_getModuleName() +
			'", positiontype ID: ' +
			positionTypeId
	);
	_formObject = new UiForm(
		form.getFormConfig(
			_getModuleName(),
			positionTypeId,
			_formIdName,
			_formData,
			_staticData,
			_isNewDataset
		)
	);
	const renderFormInConainter = contentId ? contentId : _getFormSelector();
	await form.initForm(
		_getModuleName(),
		positionTypeId,
		_formEvent,
		_formObject,
		_formData,
		_staticData,
		_isNewDataset,
		renderFormInConainter,
		headerPK
	);
}
function _bindUiListPickerEmployees(
	elementName,
	defaultTabId,
	availableList,
	assignedList
) {
	const element = _formObject.getElementByName(elementName);
	const configuration = {};
	configuration.listOutputElement = "#" + element.getId();
	if (elementName === BEC.LISTEMPLS) {
		configuration[BEC.LISTEMPLS] = true;
		configuration.Id = "#" + defaultTabId + " dd";
	}
	if (!configuration[elementName]) {
		throw new Error(
			'function _bindUiListPickerEmployees() only works with elementId: "listEmpls"'
		);
	}
	if (isUndefined(assignedList)) {
		assignedList = [];
	}
	const $selector = $(configuration.Id);
	if ($selector.length === 1) {
		UiListPicker.initialize({
			container: configuration.Id,
			availableList: {
				title: TC.available,
				content: _.clone(availableList)
			},
			assignedList: {
				title: TC.assigned,
				content: _.clone(assignedList)
			},
			filter: {
				lru: "",
				onEvent: "keyup blur"
			},
			outputElementId: configuration.listOutputElement,
			searchParameterArray: ["name", "code"],
			textParameterArray: ["name", "code"],
			onChange: selection => {
				element.__DEPRECATED__setValue(selection.join());
			}
		});
	} else {
		throw new Error("function _bindUiListPickerEmployees() selector not found");
	}
	$selector.find("ul").sortable("disable");
	const taskElementValue = _formObject.__DEPRECATED__getValueStringOpt(
		BEC.ISTASK
	);
	const setAsNoTask = taskElementValue === BEC.ISTASK + "_false";
	if (taskElementValue === null) {
		return;
	}
	if (!setAsNoTask) {

		if (_formEvent === buttons.STATE.edit || _formEvent === buttons.STATE.new) {

			$selector.find("ul").sortable("enable");
		} else {

			$selector.find("ul").sortable("disable");
		}



		if (elementName === BEC.LISTEMPLS && _formEvent === buttons.STATE.edit) {
			_showEmployeesDialogButton(configuration.Id);
		}
	}
}
function _bindUiListPickerPositions(
	elementName,
	defaultTabId,
	availableList,
	assignedList
) {
	const element = _formObject.getElementByName(elementName);
	const configuration = {
		listOutputElement: "#" + element.getId(),
		id: defaultTabId
	};
	const $selector = $("#" + configuration.id);
	if ($selector.length === 1) {
		UiListPicker.initialize({
			container: "#" + configuration.id,
			availableList: {
				title: TC.available,
				content: _.clone(availableList)
			},
			assignedList: {
				title: TC.assigned,
				content: _.clone(assignedList)
			},
			filter: {
				lru: "",
				onEvent: "keyup blur"
			},
			outputElementId: configuration.listOutputElement,
			searchParameterArray: ["name"],
			textParameterArray: ["name"],
			onChange: selection => {
				element.__DEPRECATED__setValue(selection.join());
			}
		});
	} else {
		throw new Error("function _bindUiListPickerPositions() selector not found");
	}
	if (_formEvent === buttons.STATE.edit || _formEvent === buttons.STATE.new) {

		$selector.find("ul").sortable("enable");
	} else {

		$selector.find("ul").sortable("disable");
	}
}
function bindTaskProgress(data) {
	const elem = _formObject.getElementByName(BEC.PERCCOMPLETED);
	let obj;
	if (data.basic.isTask) {
		obj = {
			element: $("#" + elem.getId()),
			showpercent: Number(_staticData.settings.taskShowPerc),
			prefreopen: Number(_staticData.settings.privTaskReopen),
			taskid: data.task.taskID,
			status: data.task.taskStatus,
			percent: data.task.percCompleted,
			decisionResult: false
		};
	} else {

		obj = {
			element: $("#" + elem.getId()),
			showpercent: Number(_staticData.settings.taskShowPerc),
			prefreopen: Number(_staticData.settings.privTaskReopen),
			taskid: null,
			status: 1,
			percent: 0,
			decisionResult: false
		};
	}
	_pluginObj[BEC.PERCCOMPLETED] = obj;
	progressbar = createTaskProgress(
		obj.element,
		obj.taskid,
		obj.showpercent,
		obj.prefreopen,
		obj.status,
		obj.percent
	);
	progressbar.on("change", function (values) {

		progressbar.setStatusOnSuccess();


		_pluginObj[BEC.PERCCOMPLETED] = values;
		formHelper.setCompleteDate(values.status, _formObject, _staticData);
	});
	if (_formEvent !== buttons.STATE.edit && _formEvent !== buttons.STATE.new) {
		progressbar.setDisabled();
	}
	if (!data.basic.isTask) {
		progressbar.setDisabled();
	}
}
function _bindPluginsAfterFormRender(positionTypeId) {
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:
			if (
				_.includes(
					[
						POSITIONTYPES.EXTERNAL,
						POSITIONTYPES.SERVICE,
						POSITIONTYPES.MEDIA,
						POSITIONTYPES.HOURS,
						POSITIONTYPES.INTCOSTS,
						POSITIONTYPES.ACONTOSPECIAL,
						POSITIONTYPES.ACONTO
					],
					positionTypeId
				)
			) {
				if (
					preferences.isPreferenceTrue(
						_staticData,
						preferences.PREFERENCE.HASPROJECTTASKS
					)
				) {

					const elem = _formObject.getElementByName(BEC.LINKCOMM);
					addFixedTooltip($("#" + elem.getId()).find("a"));

					_bindUiListPickerEmployees(
						BEC.LISTEMPLS,
						_formObject.getRowIdOfElementName(BEC.LISTEMPLS),
						_generalDataEmplLists.listEmpls,
						_formData.task.listEmpls
					);

					if (
						privileges.getPrivilege(
							_staticData,
							privileges.PRIVILEGE.TASKDEPENDENCIES
						)
					) {

						_formObject.__DEPRECATED__setValue(
							BEC.LISTTASKS,
							formHelper.getDependentTasksList(
								_formEvent,
								_formObject,
								_formData
							)
						);
					}

					bindTaskProgress(_formData);
				}
			} else if (_.includes([POSITIONTYPES.TEXT], positionTypeId)) {
				if (
					preferences.isPreferenceTrue(
						_staticData,
						preferences.PREFERENCE.HASPROJECTTASKS
					)
				) {

					const elem = _formObject.getElementByName(BEC.LINKCOMM);
					addFixedTooltip($("#" + elem.getId()).find("a"));

					_bindUiListPickerEmployees(
						BEC.LISTEMPLS,
						_formObject.getRowIdOfElementName(BEC.LISTEMPLS),
						_generalDataEmplLists.listEmpls,
						_formData.task.listEmpls
					);

					if (
						privileges.getPrivilege(
							_staticData,
							privileges.PRIVILEGE.TASKDEPENDENCIES
						)
					) {

						_formObject.__DEPRECATED__setValue(
							BEC.LISTTASKS,
							formHelper.getDependentTasksList(
								_formEvent,
								_formObject,
								_formData
							)
						);
					}

					bindTaskProgress(_formData);
				}
			} else if (_.includes([POSITIONTYPES.SUBTOTAL], positionTypeId)) {
				_bindUiListPickerPositions(
					BEC.LISTPOS,
					_formObject.getRowIdOfElementName(BEC.LISTPOS),
					_formData.basic.listPos,
					_formData.basic.listPosConnected
				);
			}
			break;
		case ModuleNameEnum.CEHEADER:
			if (_.includes([POSITIONTYPES.SUBTOTAL], positionTypeId)) {
				_bindUiListPickerPositions(
					BEC.LISTPOS,
					_formObject.getRowIdOfElementName(BEC.LISTPOS),
					_formData.basic.listPos,
					_formData.basic.listPosConnected
				);
			}
			break;
		case ModuleNameEnum.CIHEADER:
			if (_.includes([POSITIONTYPES.SUBTOTAL], positionTypeId)) {
				_bindUiListPickerPositions(
					BEC.LISTPOS,
					_formObject.getRowIdOfElementName(BEC.LISTPOS),
					_formData.basic.listPos,
					_formData.basic.listPosConnected
				);
			}
			break;
		default:
			break;
	}
}
async function _resetDetails() {
	setTableOverlayPanel("");
	const isAddTask =
		typeof _options !== "undefined" && _options.hasOwnProperty("addTask")
			? _options.addTask === 1
			: false;
	if (_tableObject.getCurrentRow() === null || isAddTask) {

		await _removeDetails();
	} else {

		await _showForm(buttons.STATE.show, _getDataFromSelectedEntry());
	}
}
async function _removeDetails() {
	_hideTheForm();
	await _createToolbarTable(buttons.STATE.initialize);
	_showFormButtons(buttons.STATE.initialize);
}
function urlParameterAvailable(name = "") {
	return window.location.href.indexOf(name) !== -1;
}
function setIdToUrl(id) {
	if (urlParameterAvailable("serviceID")) {
		setUrlParameter("serviceID", id.toString());
	}
}
async function _showForm(setEvent, selection, contentId = null) {
	_isNewDataset = false;
	triggerSelectionChangeEvent = true;
	_formEvent = setEvent;
	if (selection) {
		_tableSelectionPosNo = selection.jpos_posno;
		_tableSelectionJobNo = selection.jpos_jobid;

		const para = {
			theJobID: selection.jpos_jobid,
			thePosNo: selection.jpos_posno,
			theHeaderType: selection.jpos_headertype,
			theSubPosNo: selection.jpos_subposno
		};

		const data = await servicesData.getPosData(para);
		if (data !== null) {

			if (
				_.includes(
					[
						POSITIONTYPES.EXTERNAL,
						POSITIONTYPES.MEDIA,
						POSITIONTYPES.SERVICE,
						POSITIONTYPES.HOURS,
						POSITIONTYPES.INTCOSTS,
						POSITIONTYPES.TEXT,
						POSITIONTYPES.ACONTOSPECIAL,
						POSITIONTYPES.ACONTO,
						POSITIONTYPES.SUBTOTAL
					],
					data.basic.idPosType
				)
			) {

				_formData = data;

				await _createFormWidget(
					data.basic.idPosType,
					getPKfromModule(),
					contentId
				);

				_setCalculationButton(data.basic.idPosType);

				_setEnhanceButton(data.basic.idPosType);

				if (
					preferences.isPreferenceTrue(
						_staticData,
						preferences.PREFERENCE.HASPROJECTTASKS
					)
				) {
					reOpenTaskButton(data.basic.idPosType, setEvent);
				}

				_setDefaultLayoutButton(data.basic.idPosType, setEvent);

				setTechnicalTextButton(_formObject, data.basic.idPosType);

				_setCostsButton(data.basic.idPosType, setEvent);

				_bindPluginsAfterFormRender(data.basic.idPosType);

				_showTheForm();
				if (!_isFormInDialog) {
					setTableOverlayPanel(setEvent);

					_showFormButtons(setEvent);

					setIdToUrl(selection.jpos_posno);
				} else {
					_showFormButtons(setEvent);

				}
			} else {
				showLoadingWarning("form not defined");
				await _removeDetails();
			}
		} else {
			await _removeDetails();
		}
	} else {

		await _removeDetails();
	}
}
async function _showFormNewPosition(setEvent, postypeID, serverData) {
	_isNewDataset = true;
	_formEvent = setEvent;
	if (!_isFormInDialog) {
		setTableOverlayPanel(setEvent);

		_tableSelectionPosNo = null;

		_tableObject.setCurrentRow(null);
	}
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:
			{
				const hPk = getPKfromModule();
				const data = await servicesData.getDefaultsForNewPos(
					{
						theJobID: hPk.jobid,
						thePostype: postypeID
					},
					servicesData.ServiceHeaderType.JOB
				);
				await _showFormNewPositionExtended(setEvent, data, getPKfromModule());
			}
			break;
		case ModuleNameEnum.SIHEADER:
			if (!serverData) {
				throw new Error();
			}
			await _showFormNewPositionExtended(
				setEvent,
				serverData,
				getPKfromModule()
			);
			break;
		case ModuleNameEnum.CEHEADER:
			{
				const hPk = getPKfromModule();
				const data = await servicesData.getDefaultsForNewPos(
					{
						theJobID: hPk.ceId,
						thePostype: postypeID
					},
					servicesData.ServiceHeaderType.CE
				);
				await _showFormNewPositionExtended(setEvent, data, getPKfromModule());
			}
			break;
		case ModuleNameEnum.ORDER:
			{
				const hPk = getPKfromModule();
				const data = await servicesData.getDefaultsForNewPos(
					{
						theJobID: hPk.orderId,
						thePostype: postypeID
					},
					servicesData.ServiceHeaderType.ORDER
				);
				await _showFormNewPositionExtended(setEvent, data, getPKfromModule());
			}
			break;
		case ModuleNameEnum.CIHEADER:
			{
				const hPk = getPKfromModule();
				const data = await servicesData.getDefaultsForNewCIPos({
					ciBookId: hPk.ciBookId,
					ciHeaderId: hPk.ciHeaderId,
					posType: postypeID
				});
				await _showFormNewPositionExtended(setEvent, data, getPKfromModule());
			}
			break;
		default:
			throw new Error('Invalid type "_getModuleName()"');
	}
}
async function _showFormNewPositionExtended(setEvent, data, headerPK) {
	_formData = data;
	await _createFormWidget(
		data.basic.idPosType,
		headerPK,
		_isFormInDialogSelector
	);
	_setCalculationButton(data.basic.idPosType);
	_setEnhanceButton(data.basic.idPosType);
	_setDefaultLayoutButton(data.basic.idPosType, setEvent);
	setTechnicalTextButton(_formObject, data.basic.idPosType);
	_setCostsButton(data.basic.idPosType, setEvent);
	_bindPluginsAfterFormRender(data.basic.idPosType);
	_showTheForm();
	_showFormButtons(setEvent);
}
function setTableOverlayPanel(setEvent) {
	switch (setEvent) {
		case buttons.STATE.edit:
		case buttons.STATE.new:
			SplitViewPage.disableOverviewPage();
			break;
		default:
			SplitViewPage.enableOverviewPage();
			break;
	}
}
async function _saveForm(removeShowWarning, successWithInfoOptions) {
	if (_formObject.validate()) {
		const hPk = getPKfromModule();
		const saveData = convertData(
			hPk,
			_formObject.__DEPRECATED__getValues(),
			_formData,
			_getModuleName(),
			_pluginObj,
			_isNewDataset,
			removeShowWarning,
			successWithInfoOptions
		);

		const json = await servicesData.setSavedPos(saveData, _isNewDataset);
		if (json.stat.status === STATUS.SUCCESS) {

			if (_isNewDataset) {
				_tableSelectionPosNo = json.data.posNo;
			}
			await _saveCompleted(_tableSelectionPosNo);
			return true;
		} else if (json.stat.status === STATUS.INFO) {


			if (
				_.includes(Object.keys(json.data), "askSplitPos") ||
				_.includes(Object.keys(json.data), "askHowToChange")
			) {
				await showSISaveDialog(json.data);
				return true;
			}
		} else if (json.stat.status === STATUS.VALIDATE) {
			await showWarningDialog(json.stat.message);
		} else if (json.stat.status === STATUS.WARNING) {

			await showSISaveConfirmDialog(json.data.warnings);
		}
	} else {
		showLoadingWarning(pageTC.requiredInformation);
	}
	return false;
}
async function _saveCompleted(newPosNo) {
	_formObject.setActive(false);
	_formObject.memorizeCurrentValues();
	if (_isFormInDialog && _isFormInDialogJobPK !== null) {
		_isFormInDialogJobPK.jpos_posno = newPosNo;

		await _showForm(
			buttons.STATE.show,
			_isFormInDialogJobPK,
			_isFormInDialogSelector
		);
	} else {

		await _updateTableContent();
	}
}
async function showSISaveConfirmDialog(message) {
	const ok = await confirmDialog(message);
	if (ok) {
		await _saveForm(true);
	}
}
async function showSISaveDialog(data) {
	const defaultSetting = {
			doSplitPos: true,
			chargeType: 10
		},
		elements = {
			chbox: new UiElementCheckbox({
				name: "splitPos",
				value: defaultSetting.doSplitPos
			}),
			radio: new UiElementRadio({
				name: "howToCharge",
				value: defaultSetting.chargeType,
				selectOptions: _.map(_staticData.lists.listChargeTypes, function (obj) {
					return { id: obj.id, name: obj.name };
				})
			})
		};
	let askSplitPosText,
		asHowToChargeText,
		html = "";
	html += '<table class="Q_form formlike">';
	if (data.askSplitPos) {
		if (_formData.settings.ciExists) {
			askSplitPosText = TC.askSplitPosCiExists;
		} else {
			askSplitPosText = TC.askSplitPos;
		}
		html += "<tr><td>" + elements.chbox.getHTML() + "</td>";
		html += "<td>" + askSplitPosText + "<br><br></td></tr>";
	}
	if (data.askHowToCharge) {
		asHowToChargeText = TC.howToCharge;
		html += '<tr><td colspan="2"><br><br>' + asHowToChargeText + "</td></tr>";
		html +=
			'<tr><td colspan="2"><div>' +
			elements.radio.getHTML() +
			"</div></td></tr>";
	}
	html += "</table>";
	const dialog = new UiDialog({
		autoClose: true,
		html,
		title: pageTC.confirmation,
		async onClose(ok) {
			return ok ? _saveForm(true, defaultSetting) : true;
		}
	});
	elements.chbox.onChange(element => {
		defaultSetting.doSplitPos = element.getValueBoolean();
	});
	elements.radio.onChange(element => {
		defaultSetting.chargeType = element.getValueAsNumber();
	});
	if (data.askSplitPos) {
		elements.chbox.bindEvents();
	}
	if (data.askHowToCharge) {
		elements.radio.bindEvents();
	}
	await dialog.open();
}
async function getSortDialog() {
	let sortOrder = 1;
	const NAME = "sortPosition";
	const elements = {
		radio: new UiElementRadio({
			name: "sortOrder",
			value: sortOrder,
			selectOptions: [
				{
					id: "1",
					name: TC.sortByCategory
				},
				{
					id: "2",
					name: TC.sortByGroup
				}
			]
		})
	};
	const html = `<div class=${NAME}>
    <table class="Q_form formlike">
            <tr>
                <td>${elements.radio.getHTML()}</td>
            </tr>
        </table>
    </div>`;
	if (_parentTableSelection === null) {
		throw new Error("No row selected");
	}
	const dialog = new UiDialog({
		autoClose: true,
		html,
		title: pageTC.confirmation,
		onClose(ok) {
			if (ok) {
				return sendSortCommandToBE(_parentTableSelection, sortOrder);
			}
			return Promise.resolve(true);
		}
	});
	elements.radio.onChange(element => {
		sortOrder = element.getValueAsNumber();
	});
	elements.radio.bindEvents();
	$("." + NAME + " table").attr("style", "width: 100%");
	$("." + NAME + " table td").attr("style", "text-align: center");
	const isClosed = await dialog.open();
	if (isClosed) {
		await _updateTableContent();
	}
}
async function sendSortCommandToBE(currentRow, sortOrder) {
	const moduleName = _getModuleName();
	switch (moduleName) {
		case ModuleNameEnum.JOB:
			return servicesData.setJobSortType(currentRow.job_jobid, sortOrder);
		case ModuleNameEnum.CEHEADER:
			return servicesData.setCeSortType(currentRow.cehe_ceid, sortOrder);
		case ModuleNameEnum.CIHEADER:
			return servicesData.setCiSortType(
				{
					ciBookId: currentRow.cihe_bookid,
					ciHeaderId: currentRow.cihe_ciheaderid
				},
				sortOrder
			);
		default:
			throw new Error('Invalid name "' + moduleName + '"');
	}
}
async function deleteEntryJob(para) {
	const result = await servicesData.setDeletePosList(para);
	if (result) {
		if (_isFormInDialog && _isFormInDialogSelector !== null) {
			$(_isFormInDialogSelector).html("");

			_showFormButtons(buttons.STATE.initialize);
		} else {
			_tableSelectionPosNo = null;
			await _updateTableContent();
















		}
	}
}
async function deleteEntrySiCheck() {
	const selectedListPosNo = _tableObject
		.getSelection()
		.map(el => el.jpos_posno);
	const hPk = getPKfromModule();
	const data = await servicesData.setSiCheckDeletePos({
		idSiBook: hPk.idSiBook,
		siHeaderId: hPk.siHeaderId,
		listPosNos: selectedListPosNo
	});
	if (data.askSupplRemains) {

		const ok = await confirmDialog(TC.askJobservicesStayAssigned);
		if (ok) {
			await deleteEntrySi(true);
		} else {
			await deleteEntrySi(false);
		}
	} else {

		await deleteEntrySi(true);
	}
}
async function deleteEntrySi(supplRemains) {
	const selectedListPosNo = _tableObject
		.getSelection()
		.map(el => el.jpos_posno);
	const hPk = getPKfromModule();
	const para = {
		idSiBook: hPk.idSiBook,
		siHeaderId: hPk.siHeaderId,
		supplRemains: supplRemains,
		lockTimestamp: _formData.settings.lockTimestamp,
		listPosNos: selectedListPosNo
	};
	await servicesData.setSiDeletePos(para);
	_tableSelectionPosNo = null;
	await _updateTableContent();
}
async function setDeletePosList(para) {
	const result = await servicesData.setDeletePosList(para);
	if (result) {

		_tableSelectionPosNo = null;
		await _updateTableContent();
	}
}
async function _deleteEntry(disableWarnings = false) {
	let pk = null;
	if (_isFormInDialog && _isFormInDialogJobPK !== null) {
		pk = {
			jobId: _isFormInDialogJobPK.jpos_jobid,
			headerType: _isFormInDialogJobPK.jpos_headertype,
			listPosNos: _isFormInDialogJobPK.jpos_posno
				? [_isFormInDialogJobPK.jpos_posno]
				: [],
			subPosNo: _isFormInDialogJobPK.jpos_subposno
		};
	} else {
		pk = getPKFromSelection();
	}
	if (pk === null) {
		return;
	}
	const data = {
		jobID: pk.jobId,
		headerType: pk.headerType,
		listPosNos: pk.listPosNos,
		subPosNo: pk.subPosNo,
		lockTimestamp: _formData.settings.lockTimestamp,
		showWarnings: !disableWarnings
	};
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:
			await deleteEntryJob(data);
			break;
		case ModuleNameEnum.SIHEADER:
			await deleteEntrySiCheck();
			break;
		case ModuleNameEnum.CEHEADER:
			await setDeletePosList(data);
			break;
		case ModuleNameEnum.ORDER:
			await setDeletePosList(data);
			break;
		case ModuleNameEnum.CIHEADER:
			await setDeletePosList(data);
			break;
		default:
			throw new Error(
				'Invalid name "' + _getModuleName() + '" in _deleteEntry()'
			);
	}
}
function showEnhanceEffect($selector, hiddenClassName, type = "slideandfade") {
	switch (type) {

		case "show":
			$selector.removeClass(hiddenClassName);
			break;
		case "fold":

			$selector.hide().removeClass(hiddenClassName).slideDown(500).show();
			break;
		case "fade":

			$selector
				.css({ opacity: 0 })
				.removeClass(hiddenClassName)
				.animate({ opacity: 1 }, 600);
			break;
		case "slideandfade":

			$selector
				.css({ opacity: 0 })
				.hide()
				.removeClass(hiddenClassName)
				.slideDown(300)
				.animate({ opacity: 1 }, 250);
			break;
		default:
			throw new Error('Invalid type "' + type + '" in showEnhanceEffect()');
	}
}
function _setCalculationButton(positionTypeId) {
	let showButton = true,
		showButtonInTab = 1;
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:

			showButtonInTab = 1;
			break;
		case ModuleNameEnum.SIHEADER:

			showButtonInTab = 1;
			break;
		case ModuleNameEnum.CEHEADER:

			showButtonInTab = 1;
			break;
		default:
			break;
	}
	switch (positionTypeId) {
		case POSITIONTYPES.TEXT:
			showButton = false;
			break;
		case POSITIONTYPES.SUBTOTAL:
			showButton = false;
			break;
		default:

			break;
	}
	if (showButton) {

		new UiButton(
			TC.showCalculation,
			"showCalcBtn",
			async function () {

				await _showCalculationDialog();
			},
			"calculator"
		).appendHTML("#" + _formObject.getPageId(showButtonInTab));
	}
}
function _setEnhanceButton(positionTypeId) {
	let showButton = true,
		showButtonInTab = 1;
	switch (_getModuleName()) {

		case ModuleNameEnum.JOB:
			showButtonInTab = 1;
			break;
		case ModuleNameEnum.SIHEADER:

			showButtonInTab = 1;
			break;
		case ModuleNameEnum.CEHEADER:

			showButtonInTab = 1;
			break;
		default:
			break;
	}
	switch (positionTypeId) {
		case POSITIONTYPES.TEXT:
			showButton = false;
			break;
		case POSITIONTYPES.SUBTOTAL:
			showButton = false;
			break;
		default:

			break;
	}
	if (showButton) {
		const COOKIE = new CookieStorage(
			"services_price_enhanced_" + _getModuleName()
		);

		new UiButton(
			TC.enhanced,
			"enhancedBtn",
			function (e) {
				const btnIcon = e.currentTarget;
				const $enhancedElements = $("#" + _formObject.getFormId()).find(
					".enhanced"
				);

				if (COOKIE.get() === "true") {

					$enhancedElements.addClass("enhanced_hidden");
					switchButtonIcon(btnIcon, "caret-1-n", "caret-1-s");
					COOKIE.set("false");
				} else {

					showEnhanceEffect($enhancedElements, "enhanced_hidden");
					switchButtonIcon(btnIcon, "caret-1-s", "caret-1-n");
					COOKIE.set("true");
				}
			},
			"caret-1-s"
		).appendHTML("#" + _formObject.getPageId(showButtonInTab));

		if (COOKIE.get() === "true") {
			switchButtonIcon("#" + _formObject.getFormId(), "caret-1-s", "caret-1-n");
			$("#" + _formObject.getFormId())
				.find(".enhanced")
				.removeClass("enhanced_hidden");
		}
	}
}
function _setDefaultLayoutButton(positionTypeId, setEvent) {
	const $selector = $(".showDefaultBtn");
	const showButtonInTab = _formObject.getPageIndexWithElementName(
		BEC.POSITIONPRINT
	);
	console.log(_formObject.getPageIdWithElementName(BEC.POSITIONPRINT));
	switch (setEvent) {

		case buttons.STATE.edit:

			if (
				_getModuleName() === ModuleNameEnum.SIHEADER &&
				_formData.settings[SETTINGS.CIEXISTS]
			) {
				break;
			}

			if ($selector.length === 0) {

				new UiButton(
					TC.defaultSettings,
					"showDefaultBtn",
					async function () {

						if (_tableSelectionJobNo === null) {
							throw new Error(
								'In edit mode the variable "_tableSelectionJobNo" must have a number'
							);
						}
						await formHelper.setLayoutElementsDefaultRoutine(
							_formObject,
							_formData,
							_tableSelectionJobNo
						);
					},
					"gear",
					undefined,
					false
				).appendHTML("#" + _formObject.getPageId(showButtonInTab));
			}
			break;

		default:

			if ($selector.length === 1) {
				$selector.remove();
			}
			break;
	}
}
function _showEmployeesDialogButton(appendTo) {
	const className = "changeEmplSelectionInfoBtn";
	const button = new UiButton(
		TC.enhancedSelection,
		className,
		async () => {
			await showAssignResourcesDialog(appendTo);
		},
		"btn-img-emplAssign"
	);
	button.appendHTML(appendTo);
	new DomElement(`.${className}`).setCssObject({
		float: "right",
		marginTop: 10,
		marginRight: 5
	});
}
async function showAssignResourcesDialog(appendTo) {
	const { taskID } = _formData.task;
	const ok = await showEmployeeAssignDialog(taskID);
	if (ok) {
		const formDataPointerCopy = _formData;
		const data = await servicesData.getTaskEmpl(taskID);

		formDataPointerCopy.task.listEmpls = data;
		_formObject.__DEPRECATED__setValue(BEC.LISTEMPLS, data.join(","));

		$(appendTo).html(_formObject.getElementByName(BEC.LISTEMPLS).getHTML());

		_bindPluginsAfterFormRender(formDataPointerCopy.basic.idPosType);
	}
}
function _setCostsButton(positionTypeId, event) {
	switch (event) {

		case buttons.STATE.initialize:
			break;

		case buttons.STATE.show:
			break;

		case buttons.STATE.reset:
			break;

		case buttons.STATE.edit:
		case buttons.STATE.new:
			switch (_getModuleName()) {
				case ModuleNameEnum.SIHEADER:
					if (
						_.includes(
							[POSITIONTYPES.EXTERNAL, POSITIONTYPES.MEDIA],
							positionTypeId
						)
					) {
						formHelper.addButtonFormPageCosts(
							_staticData,
							_formObject,
							BEC.NCHCOSTCENTRE
						);
					}
					break;
				case ModuleNameEnum.CIHEADER:
					if (_.includes([POSITIONTYPES.INTCOSTS], positionTypeId)) {
						formHelper.addButtonFormPageCosts(
							_staticData,
							_formObject,
							BEC.NCHCOSTCENTRE
						);
					}
					break;
				case ModuleNameEnum.JOB:
				case ModuleNameEnum.CEHEADER:
				case ModuleNameEnum.ORDER:
					break;
				default:
					throw new Error('Invalid type "_getModuleName()"');
			}
			break;
		default:
			throw new Error('Invalid event _setCostsButton("' + event + '")');
	}
}
function reOpenTaskButton(positionTypeId, event) {
	switch (_getModuleName()) {

		case ModuleNameEnum.JOB:

			if (positionTypeId !== POSITIONTYPES.SUBTOTAL) {
				formHelper.addButtonReOpenTask(
					_getModuleName(),
					_staticData,
					_formObject,
					_formData.task.taskID,
					event
				);
			}
			break;
		default:
			break;
	}
}
function _buttonNewPositions() {
	const serviceTypes = _staticData.lists.listPosTypes.filter(e => e.isUsed);
	const btnArray = serviceTypes.map((obj, i) => {
		return {
			rowId: "addPosition" + i,
			rowText: obj.name,
			rowListener: async function () {
				await _getNewPositionForm(obj.id);
			}
		};
	});
	return new UiSelectButton(TC.new, "newPosition", btnArray, "caret-1-s");
}
export async function onEdit() {
	if (_isFormInDialog) {
		await _showForm(
			buttons.STATE.edit,
			_isFormInDialogJobPK,
			_isFormInDialogSelector
		);
	} else {
		await _showForm(buttons.STATE.edit, _getDataFromSelectedEntry());
	}
}
async function onDelete() {
	let selectionCount = 0;
	if (_isFormInDialog) {
		selectionCount = 1;
	} else {
		selectionCount = _tableObject.getSelectionCount();
	}
	const ok = await confirmDialog(getDeleteDialogText(selectionCount));
	if (ok) {
		await _deleteEntry();
	}
}
async function onDeleteAndMoveNCH() {
	const pk = getPKFromSelection();
	if (pk === null) {
		return;
	}
	const ok = await confirmDialog(TC.confirmationDeleteAndMoveNCH);
	if (ok) {
		const data = {
			jobID: pk.jobId,
			headerType: pk.headerType,
			listPosNos: pk.listPosNos,
			subPosNo: pk.subPosNo
		};
		let setNchData = {};
		const infoForDelete = await servicesData.getInfoForDeleteCiPosList(data);
		if (infoForDelete.doShowNCHInfo) {
			const { nchAccount, nchCostCentre } = infoForDelete;
			setNchData = await showNchInfoDialog(
				{ nchAccount, nchCostCentre },
				_staticData
			);
		}
		if (setNchData !== null) {
			const setDeleteData = {
				...data,
				...setNchData,
				lockTimestamp: _formData.settings.lockTimestamp,
				showWarnings: true
			};
			const result = await servicesData.setDeleteCiPosList(setDeleteData);
			if (result) {

				_tableSelectionPosNo = null;
				await _updateTableContent();
			}
		}
	}
}
function _buttonDeleteCiPositions() {
	return new UiSelectButton(
		TC.buttonDelete,
		"deleteCiPosition",
		[
			{ rowId: "deleteCI", rowText: TC.buttonDelete, rowListener: onDelete },
			{
				rowId: "deleteCIAndMoveNCH",
				rowText: TC.buttonDeleteAndMoveNCH,
				rowListener: onDeleteAndMoveNCH
			}
		],
		"trash"
	);
}
async function onCancel() {
	triggerSelectionChangeEvent = true;
	if (
		!_formObject.valuesAreEqualWithMemorizedValues() &&
		getSession().userPreferences.notifyCancelChanges
	) {
		const ok = await confirmDialog(pageTC.dialogTextConfirmCancel);
		if (ok) {
			if (_isFormInDialog) {
				await onCancelInDialog();
			} else {
				await _resetDetails();
			}
		} else {
			if (prevRows !== null) {
				triggerSelectionChangeEvent = false;
				_tableObject.setSelection(prevRows);
			}
		}
	} else {
		if (_isFormInDialog) {
			await onCancelInDialog();
		} else {
			await _resetDetails();
		}
	}
}
async function onCancelInDialog() {
	if (_isNewDataset && _isFormInDialogSelector !== null) {

		$(_isFormInDialogSelector).html("");

		_showFormButtons(buttons.STATE.initialize);
	} else {
		await _showForm(
			buttons.STATE.show,
			_isFormInDialogJobPK,
			_isFormInDialogSelector
		);
	}
}
async function onSave() {
	await _saveForm(false);
}
function _showFormButtons(manualSetEvent) {
	const p = {
		create: privileges.getPrivilege(_staticData, privileges.PRIVILEGE.CREATE),
		modify: privileges.getPrivilege(_staticData, privileges.PRIVILEGE.MODIFY),
		delete: privileges.getPrivilege(_staticData, privileges.PRIVILEGE.DELETE)
	};
	if (_getModuleName() === ModuleNameEnum.SIHEADER) {
		p.create = privileges.getPrivilege(
			_staticData,
			privileges.PRIVILEGE.SIPOSNEW
		);
	}
	const s = {
		canBeCreated: false,
		editable: false,
		canBeDeleted: false
	};
	if (manualSetEvent) {
		_formEvent = manualSetEvent;
	}
	s.canBeCreated = _positionSettings.settings[SETTINGS.CREATEABLE];
	s.canBeDeleted = _positionSettings.settings[SETTINGS.DELETABLE];
	if (
		_formData &&
		_formEvent !== buttons.STATE.new &&
		_formEvent !== buttons.STATE.initialize &&
		_formEvent !== buttons.STATE.multipleInitialize &&
		_formEvent !== buttons.STATE.delete
	) {
		s.editable = _formData.settings[SETTINGS.MODIFIABLE];


		if (!s.editable) {

			console.log(
				"entry not editable: set _formEvent from",
				_formEvent,
				"to",
				buttons.STATE.show
			);

			_formEvent = buttons.STATE.show;
		}
	}
	console.log("_showFormButtons: ", _formEvent);
	console.log("privileges", p);
	console.log("settings", s);
	let toolbar;
	if (_isFormInDialog) {
		toolbar = new SplitViewMenu.Toolbar("showFormOnly");
	} else {
		toolbar = new SplitViewMenu.Toolbar("form");
	}
	switch (_formEvent) {

		case buttons.STATE.initialize:
			if (p.create && s.canBeCreated) {
				toolbar.add(_buttonNewPositions());
			}
			break;

		case buttons.STATE.multipleInitialize:
			if (p.create && s.canBeCreated) {
				toolbar.add(_buttonNewPositions());
			}
			if (p.delete && s.canBeDeleted) {
				if (
					_getModuleName() === ModuleNameEnum.CIHEADER &&
					_positionSettings.settings[SETTINGS.MULTIPLEDELETE]
				) {
					toolbar.add(_buttonDeleteCiPositions(), "right");
				} else {
					toolbar.addDefaultDelete(onDelete, "right");
				}
			}
			break;

		case buttons.STATE.edit:
		case buttons.STATE.new:
			toolbar.addDefaultCancel(onCancel);
			toolbar.addDefaultSave(onSave);
			break;

		case buttons.STATE.show:
			if (p.create && s.canBeCreated) {
				toolbar.add(_buttonNewPositions());
			}
			if (p.modify && s.editable) {
				toolbar.addDefaultEdit(onEdit);
			}
			if (p.delete && s.canBeDeleted) {
				if (
					_getModuleName() === ModuleNameEnum.CIHEADER &&
					_positionSettings.settings[SETTINGS.MULTIPLEDELETE]
				) {
					toolbar.add(_buttonDeleteCiPositions(), "right");
				} else {
					toolbar.addDefaultDelete(onDelete, "right");
				}
			}
			break;

		case buttons.STATE.reset:
			if (p.create && s.canBeCreated) {

				toolbar.add(_buttonNewPositions());
			}
			break;

		case buttons.STATE.delete:
			if (p.delete && s.canBeDeleted) {
				if (
					_getModuleName() === ModuleNameEnum.CIHEADER &&
					_positionSettings.settings[SETTINGS.MULTIPLEDELETE]
				) {
					toolbar.add(_buttonDeleteCiPositions(), "right");
				} else {
					toolbar.addDefaultDelete(onDelete, "right");
				}
			}
			break;
		default:
			throw new Error('Invalid event "' + _formEvent + '"');
	}
	toolbar.render();
}
async function _showCalculationDialog() {
	await form.showCalculationDialog(
		_getModuleName(),
		TC.calculation,
		getPKfromModule()
	);
}
function setPKfromModule(parentTableSelection) {
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:
			_parentTableDataId = {
				jobid: parentTableSelection.job_jobid
			};
			break;
		case ModuleNameEnum.SIHEADER:
			_parentTableDataId = {
				siHeaderId: parentTableSelection.sihd_siheaderid,
				idSiBook: parentTableSelection.sihd_bookid
			};
			break;
		case ModuleNameEnum.CEHEADER:
			_parentTableDataId = {
				ceId: parentTableSelection.cehe_ceid
			};
			break;
		case ModuleNameEnum.ORDER:
			_parentTableDataId = {
				orderId: parentTableSelection.orde_orderid
			};
			break;
		case ModuleNameEnum.CIHEADER:
			_parentTableDataId = {
				ciHeaderId: parentTableSelection.cihe_ciheaderid,
				ciBookId: parentTableSelection.cihe_bookid
			};
			break;
		default:
			throw new Error('Invalid type "_getModuleName()"');
	}
}
function getPKfromModule() {
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:
			return _parentTableDataId;
		case ModuleNameEnum.SIHEADER:
			return _parentTableDataId;
		case ModuleNameEnum.CEHEADER:
			return _parentTableDataId;
		case ModuleNameEnum.ORDER:
			return _parentTableDataId;
		case ModuleNameEnum.CIHEADER:
			return _parentTableDataId;
		default:
			throw new Error('Invalid type "_getModuleName()"');
	}
}
function _getDataFromSelectedEntry() {
	return _tableObject.getCurrentRow();
}
async function _getNewPositionForm(postypeID) {
	switch (_getModuleName()) {
		case ModuleNameEnum.JOB:
			await _showFormNewPosition(buttons.STATE.new, postypeID);
			break;
		case ModuleNameEnum.SIHEADER:

			await _showNewJobFromTemplateDialog(postypeID);
			break;
		case ModuleNameEnum.CEHEADER:
			await _showFormNewPosition(buttons.STATE.new, postypeID);
			break;
		case ModuleNameEnum.ORDER:
			await _showFormNewPosition(buttons.STATE.new, postypeID);
			break;
		case ModuleNameEnum.CIHEADER:
			await _showFormNewPosition(buttons.STATE.new, postypeID);
			break;
		default:
			throw new Error('Invalid type "_getModuleName()"');
	}
}
async function _showNewJobFromTemplateDialog(postypeID) {
	const options = {
		title: TC.selectJobFromTemplateDialogTitle,
		showCheckbox: privileges.getPrivilege(
			_staticData,
			privileges.PRIVILEGE.SHOWALLJOBS
		),
		includeJob: true
	};
	const result = await genericJobSelectionDialog(
		options,
		".newJobFromTemplate_div"
	);
	if (result !== null && result.data.jobRequest.theJobID) {
		const hPk = getPKfromModule();
		const para = {
			theSIBookID: hPk.idSiBook,
			theSIHeaderID: hPk.siHeaderId,
			thePostype: postypeID ? postypeID : 1,
			theJobID: result.data.jobRequest.theJobID
		};
		const data = await servicesData.getDefaultsForNewSIPos(para);
		await _showFormNewPosition(buttons.STATE.new, 0, data);
	}
}
function _isButtonPresent(buttonName) {
	return SplitViewMenu.isButtonPresent(buttonName);
}
function _getButtonSelectorObject(buttonName) {
	return SplitViewMenu.getButtonSelectorObject(buttonName);
}
function _showTheForm() {
	SplitViewPage.showForm();
}
function _hideTheForm() {
	SplitViewPage.hideForm();
}
function _getFormSelector() {
	return "." + SplitViewPage.getDetailsFormClass();
}
function _getListofSelectedRow() {
	const CURRENT_ROW = _tableObject.getCurrentRow();
	return CURRENT_ROW === null
		? []
		: _.compact(_.map(_tableObject.getSelection(), "jpos_posno"));
}
function getSelectionCount() {
	const selection = _tableObject.getSelection();
	return selection.length;
}
function getPKFromSelection() {
	const selection = _tableObject.getSelection();
	if (selection.length === 0) {
		return null;
	}
	return {
		jobId: Number(selection[0].jpos_jobid),
		headerType: Number(selection[0].jpos_headertype),
		listPosNos: selection.map(obj => Number(obj.jpos_posno)),
		subPosNo: Number(selection[0].jpos_subposno)
	};
}
function _showParentTable(forceReload = true) {
	$(".form_wrapper").removeClass("serviceslist");
	if (forceReload) {
		switch (_getModuleName()) {
			case ModuleNameEnum.JOB:
				if (_reloadTable !== null) {
					_reloadTable();
				}
				break;
			case ModuleNameEnum.SIHEADER:
				if (_reloadTable !== null) {
					_reloadTable();
				}
				break;
			case ModuleNameEnum.CEHEADER:
				if (_reloadTable !== null) {
					_reloadTable();
				}
				break;
			case ModuleNameEnum.ORDER:
				if (_reloadTable !== null) {
					_reloadTable();
				}
				break;
			case ModuleNameEnum.CIHEADER:
				if (_reloadTable !== null) {
					_reloadTable();
				}
				break;
			default:
				break;
		}
	}
}
function _setParentModulSettings(moduleName) {
	switch (moduleName) {
		case ModuleNameEnum.JOB:
			_parentModuleSettings = {
				type: "job",
				moduleName: moduleName
			};
			break;
		case ModuleNameEnum.CEHEADER:
			_parentModuleSettings = {
				type: "ce",
				moduleName: moduleName
			};
			break;
		case ModuleNameEnum.SIHEADER:
			_parentModuleSettings = {
				type: "si",
				moduleName: moduleName
			};
			break;
		case ModuleNameEnum.ORDER:
			_parentModuleSettings = {
				type: "order",
				moduleName: moduleName
			};
			break;
		case ModuleNameEnum.CIHEADER:
			_parentModuleSettings = {
				type: "ci",
				moduleName: moduleName
			};
			break;
		default:
			throw new TypeError("Invalid moduleName: " + moduleName);
	}
}
function _getModuleType() {
	return _parentModuleSettings.type;
}
function _getModuleName() {
	return _parentModuleSettings.moduleName;
}
export async function initialize(
	generalDataEmplLists,
	newContainerId,
	moduleName,
	previousTableTitle
) {
	_setParentModulSettings(moduleName);
	_tableContainerId = "#" + newContainerId;
	_formIdName = moduleName + "_" + newContainerId + "-form";
	_previousTableTitle = previousTableTitle;
	_addDOMElements();
	_bindClickEvents();
	_staticData = await servicesData.getGeneralData(_getModuleType());
	if (generalDataEmplLists !== null) {
		_generalDataEmplLists = generalDataEmplLists;
	} else {
		_generalDataEmplLists = {
			listEmpls: _staticData.lists.listEmpls
		};
	}
	return _staticData;
}
export async function renderFormInDialog(contentId, data, addTask = false) {
	const moduleName = ModuleNameEnum.SERVICES;
	const pkForJobService = {
		jpos_jobid: data.jobId,
		jpos_posno: data.posNo,
		jpos_headertype: 1,
		jpos_subposno: 1
	};
	_setParentModulSettings(ModuleNameEnum.JOB);
	_isFormInDialog = true;
	_isFormInDialogSelector = contentId;
	_isFormInDialogJobPK = pkForJobService;
	_parentTableDataId = {
		jobid: data.jobId
	};
	_formIdName = moduleName + "_form";
	_staticData = await servicesData.getGeneralData("job");
	checkIsNonemptyObject(_staticData, "staticData in " + moduleName);
	const settings = await servicesData.getActionInfo(
		getPKfromModule(),
		_getModuleType()
	);
	_positionSettings.settings[SETTINGS.CREATEABLE] = settings.canBeCreated;
	_positionSettings.settings[SETTINGS.DELETABLE] = settings.canBeDeleted;
	const emailOfCurrentUser = await employeeData.getEmplList();
	_generalDataEmplLists = {
		listEmpls: emailOfCurrentUser
	};
	if (addTask) {

		_showFormButtons(buttons.STATE.initialize);
		$("#newPosition button").trigger("click");
	} else {
		await _showForm(buttons.STATE.show, pkForJobService, contentId);
	}
}
