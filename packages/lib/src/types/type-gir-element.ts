import type {
	TypeGirAlias,
	TypeGirClass,
	TypeGirEnumeration,
	TypeGirEnumerationMember,
	TypeGirFunction,
	TypeGirInterface,
	TypeGirMethod,
	TypeGirParameter,
	TypeGirProperty,
	TypeGirVariable,
} from "./index.ts";

/** Any gir element type */
export type TypeGirElement =
	| TypeGirClass
	| TypeGirMethod
	| TypeGirVariable
	| TypeGirAlias
	| TypeGirEnumeration
	| TypeGirEnumerationMember
	| TypeGirInterface
	| TypeGirParameter
	| TypeGirProperty
	| TypeGirFunction;
