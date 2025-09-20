import type {
	GirAliasElement,
	GirBitfieldElement,
	GirCallbackElement,
	GirClassElement,
	GirConstantElement,
	GirConstructorElement,
	GirEnumElement,
	GirFieldElement,
	GirFunctionElement,
	GirInterfaceElement,
	GirMethodElement,
	GirPropertyElement,
	GirRecordElement,
	GirSignalElement,
	GirUnionElement,
	GirVirtualMethodElement,
} from "./index.ts";
export type GirAnyElement =
	| GirBitfieldElement
	| GirCallbackElement
	| GirClassElement
	| GirConstantElement
	| GirEnumElement
	| GirFunctionElement
	| GirInterfaceElement
	| GirRecordElement
	| GirUnionElement
	| GirAliasElement
	| GirMethodElement
	| GirVirtualMethodElement
	| GirSignalElement
	| GirConstructorElement
	| GirFieldElement
	| GirPropertyElement;
