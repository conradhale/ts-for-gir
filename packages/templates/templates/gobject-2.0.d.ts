// @ts-nocheck
import type GLib from '@girs/glib-2.0';
import './gobject-2.0.d.ts';

declare module './gobject-2.0.d.ts' {
    namespace GObject {
        /**
         * Obtain the parameters of a function type in a tuple.
         * Note: This is a copy of the Parameters type from the TypeScript standard library to avoid name conflicts, as some GIR types define `Parameters` as a namespace.
         */
        export type GjsParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

        // __type__ forces all GTypes to not match structurally.
        export type GType<T = unknown> = {
            __type__(arg: never): T;
            name: string;
        };

        // Extra interfaces used to help define GObject classes in js; these
        // aren't part of gi.
        export interface SignalDefinition {
            flags?: SignalFlags;
            accumulator?: AccumulatorType;
            return_type?: GType;
            param_types?: GType[];
        }

        type ConstructorProps<T extends TypeOnlyRegisterClassOptions, P = {}> = Partial<
            TypeOnlyProperties<T['Properties']> & P
        >;

        namespace ParamSpec {
            type String<Opts extends { default?: string }> = Opts & { param_type: 'string'; type: string };
            type Unichar<Opts extends { default?: string }> = Opts & { param_type: 'unichar'; type: string };
            type Boolean<Opts extends { default?: boolean }> = Opts & { param_type: 'boolean'; type: boolean };
            type Char<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'char';
                type: number;
            };
            type Double<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'double';
                type: number;
            };
            type Float<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'float';
                type: number;
            };
            type Int<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'int';
                type: number;
            };
            type Int64<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'int64';
                type: number;
            };
            type Long<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'long';
                type: number;
            };
            type Uchar<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'uchar';
                type: number;
            };
            type Uint<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'uint';
                type: number;
            };
            type Uint64<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'uint64';
                type: number;
            };
            type Ulong<Opts extends { max?: number; min?: number; default?: number }> = Opts & {
                param_type: 'ulong';
                type: number;
            };
            type Enum<Opts extends { type: number; default?: number }> = Opts & { param_type: 'enum' };
            type Flags<Opts extends { type: number; default?: number }> = Opts & { param_type: 'flags' };
            type Boxed<Opts extends { type: object }> = Opts & { param_type: 'boxed' };
            type GType<Opts extends { type: object }> = Opts & { param_type: 'gtype' };
            type Object<Opts extends { type: object }> = Opts & { param_type: 'object' };
            type JSObject = { type: object; param_type: 'jsobject' };
            type Param<Opts extends { type: object }> = Opts & { param_type: 'param' };
            type Variant<Opts extends { type: GLib.VariantType; default?: GLib.Variant }> = Opts & {
                param_type: 'param';
            };
        }

        interface TypeOnlyRegisterClassOptions {
            Properties?: {
                [name: string]: boolean | number | string | object | { param_type: string; type: any };
            };
            Signals?: {
                [name: string]: [...args: object[]] | ((...args: any) => object | void);
            };
        }

        export interface RegisterClassOptions {
            GTypeName?: string;
            GTypeFlags?: TypeFlags;
            Properties?: { [key: string]: ParamSpec };
            Signals?: { [key: string]: SignalDefinition };
            Implements?: { $gtype: GType }[];
            CssName?: string;
            Template?: Uint8Array | GLib.Bytes | string;
            Children?: string[];
            InternalChildren?: string[];
            Requires?: Object[];
        }

        export type MetaInfo = RegisterClassOptions | TypeOnlyRegisterClassOptions;

        export type Property<K extends ParamSpec> = K extends ParamSpec<infer T> ? T : any;

        // Correctly types interface checks.
        export function type_is_a<T extends Object>(obj: Object, is_a_type: { $gtype: GType<T> }): obj is T;

        export class Interface<T = unknown> {
            static _classInit: (cls: any) => any;
            __name__: string;
            _construct: (params: any, ...otherArgs: any[]) => any;
            _init: (params: any) => void;
            $gtype?: GType<T>;
        }

        export namespace Object {
            // Interface for virtual method implementations
            export interface Interface extends GObject.Interface {}
        }

        /**
         * Use this to signify a function that must be overridden in an
         * implementation of the interface.
         */
        export class NotImplementedError extends Error {
            get name(): 'NotImplementedError';
        }

        export const __gtkCssName__: unique symbol;
        export const __gtkTemplate__: unique symbol;
        export const __gtkChildren__: unique symbol;
        export const __gtkInternalChildren__: unique symbol;

        // Expose GObject static properties for ES6 classes

        export const GTypeName: unique symbol;
        export const requires: unique symbol;
        export const interfaces: unique symbol;
        export const properties: unique symbol;
        export const signals: unique symbol;

        export let gtypeNameBasedOnJSPath: boolean;

        export let TYPE_BOOLEAN: GType<boolean>;
        export let Boolean: BooleanConstructor;

        export let TYPE_ENUM: GType<number>;
        export let TYPE_FLAGS: GType<number>;

        export let TYPE_DOUBLE: GType<number>;
        export let Double: NumberConstructor;

        export let TYPE_STRING: GType<string>;
        export let String: StringConstructor;

        export let TYPE_NONE: GType<undefined>;
        export let TYPE_POINTER: GType<undefined>;
        export let TYPE_BOXED: GType<unknown>;
        export let TYPE_PARAM: GType<unknown>;
        export let TYPE_INTERFACE: GType<unknown>;
        export let TYPE_OBJECT: GType<object>;
        export let TYPE_JSOBJECT: GType<Object>;
        export let TYPE_VARIANT: GType<GLib.Variant>;
        export let TYPE_INT: GType<number>;
        export let TYPE_UINT: GType<number>;
        export let TYPE_INT64: GType<number>;
        export let TYPE_UINT64: GType<number>;
        export let TYPE_FLOAT: GType<number>;

        // fake enum for signal accumulators, keep in sync with gi/object.c
        export enum AccumulatorType {
            NONE = 0,
            FIRST_WINS = 1,
            TRUE_HANDLED = 2,
        }

        // A simple workaround if you have a class with .connect, .disconnect or .emit
        // methods (such as Gio.Socket.connect or NMClient.Device.disconnect)
        // The original g_signal_* functions are not introspectable anyway, because
        // we need our own handling of signal argument marshalling
        export function signal_connect(object: Object, name: string, handler: (...args: any[]) => any): number;
        export function signal_connect_after(object: Object, name: string, handler: (...args: any[]) => any): number;
        export function signal_emit_by_name(object: Object, name: string, ...args: any[]): void;

        /**
         * Finds the first signal handler that matches certain selection criteria.
         * The criteria are passed as properties of a match object.
         * The match object has to be non-empty for successful matches.
         * If no handler was found, a falsy value is returned.
         *
         * @param instance the instance owning the signal handler to be found.
         * @param match a properties object indicating whether to match by signal ID, detail, or callback function.
         * @param match.signalId signal the handler has to be connected to.
         * @param match.detail signal detail the handler has to be connected to.
         * @param match.func the callback function the handler will invoke.
         * @returns A valid non-0 signal handler ID for a successful match.
         */
        export function signal_handler_find(
            instance: Object,
            match: { signalId: string; detail: string; func: (...args: any[]) => any },
        ): number | bigint | object | null;

        /**
         * Blocks all handlers on an instance that match certain selection criteria.
         * The criteria are passed as properties of a match object.
         * The match object has to have at least `func` for successful matches.
         * If no handlers were found, 0 is returned, the number of blocked handlers
         * otherwise.
         *
         * @param instance the instance owning the signal handler to be found.
         * @param match a properties object indicating whether to match by signal ID, detail, or callback function.
         * @param match.signalId signal the handler has to be connected to.
         * @param match.detail signal detail the handler has to be connected to.
         * @param match.func the callback function the handler will invoke.
         * @returns The number of handlers that matched.
         */
        export function signal_handlers_block_matched(
            instance: Object,
            match: { signalId: string; detail: string; func: (...args: any[]) => any },
        ): number;

        /**
         * Disconnects all handlers on an instance that match certain selection
         * criteria.
         * The criteria are passed as properties of a match object.
         * The match object has to have at least `func` for successful matches.
         * If no handlers were found, 0 is returned, the number of disconnected
         * handlers otherwise.
         *
         * @param instance the instance owning the signal handler
         *   to be found.
         * @param match a properties object indicating whether to match by signal ID, detail, or callback function.
         * @param match.signalId signal the handler has to be connected to.
         * @param match.detail signal detail the handler has to be connected to.
         * @param match.func the callback function the handler will invoke.
         * @returns The number of handlers that matched.
         */
        export function signal_handlers_unblock_matched(
            instance: Object,
            match: { signalId: string; detail: string; func: (...args: any[]) => any },
        ): number;

        /**
         * Disconnects all handlers on an instance that match certain selection
         * criteria.
         * The criteria are passed as properties of a match object.
         * The match object has to have at least `func` for successful matches.
         * If no handlers were found, 0 is returned, the number of disconnected
         * handlers otherwise.
         *
         * @param instance the instance owning the signal handler
         *   to be found.
         * @param match a properties object indicating whether to match by signal ID, detail, or callback function.
         * @param match.signalId signal the handler has to be connected to.
         * @param match.detail signal detail the handler has to be connected to.
         * @param match.func the callback function the handler will invoke.
         * @returns The number of handlers that matched.
         */
        export function signal_handlers_disconnect_matched(
            instance: Object,
            match: { signalId: string; detail: string; func: (...args: any[]) => any },
        ): number;

        // Also match the macros used in C APIs, even though they're not introspected

        /**
         * Blocks all handlers on an instance that match `func`.
         *
         * @param instance the instance to block handlers from.
         * @param func the callback function the handler will invoke.
         * @returns The number of handlers that matched.
         */
        export function signal_handlers_block_by_func(instance: Object, func: (...args: any[]) => any): number;

        /**
         * Unblocks all handlers on an instance that match `func`.
         *
         * @function
         * @param instance the instance to unblock handlers from.
         * @param func the callback function the handler will invoke.
         * @returns The number of handlers that matched.
         */
        export function signal_handlers_unblock_by_func(instance: Object, func: (...args: any[]) => any): number;

        /**
         * Disconnects all handlers on an instance that match `func`.
         *
         * @param instance the instance to remove handlers from.
         * @param func the callback function the handler will invoke.
         * @returns The number of handlers that matched.
         */
        export function signal_handlers_disconnect_by_func(instance: Object, func: (...args: any[]) => any): number;
        export function signal_handlers_disconnect_by_data(): void;

        // Helper types for type-safe signal handling
        export interface SignalSignatures {
            /** Fallback for dynamic signals and type compatibility */
            [signal: string]: (...args: any[]) => any;
        }

        /**
         * Helper to prepend the emitter (`source`) to an existing callback type.
         */
        export type SignalCallback<Emitter, Fn> = Fn extends (...args: infer P) => infer R
            ? (source: Emitter, ...args: P) => R
            : never;

        // TODO: What about the generated class Closure
        export type TClosure<R = any, P = any> = (...args: P[]) => R;

        // String conversion utilities for property names
        type SnakeToUnderscoreCase<S extends string> = S extends `${infer T}-${infer U}`
            ? `${T}_${SnakeToUnderscoreCase<U>}`
            : never;

        type SnakeToCamelCase<S> = S extends `${infer T}-${infer U}`
            ? `${T}${SnakeToPascalCase<U>}`
            : never;

        type SnakeToPascalCase<S extends string> = S extends `${infer T}-${infer U}`
              ? `${Capitalize<T>}${SnakeToPascalCase<U>}`
              : Capitalize<S>

        type SnakeToCamel<T> = { [P in keyof T as P extends `${string}-${string}` ? SnakeToCamelCase<P> : never]: T[P] };
        type SnakeToUnderscore<T> = { [P in keyof T as P extends `${string}-${string}` ? SnakeToUnderscoreCase<P> : never]: T[P] };

        type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never;

        type IFacesToGTypes<IFaces> = {
            [key in keyof IFaces]: IFaces[key] extends { $gtype: GType<infer I> } ? I : never;
        };

        export type ParamsToSignalCallback<ParamTypes extends readonly GType[]> = (
            ...args: [
                {
                    [index in keyof ParamTypes as index extends number
                        ? `arg${index}`
                        : index]: ParamTypes[index] extends GType ? ReturnType<ParamTypes[index]['__type__']> : never;
                },
            ]
        ) => void;

        export type SigsToSignalSignatures<Sigs extends { [key: string]: SignalDefinition }> = {
            [signal in keyof Sigs]: Sigs[signal]['param_types'] extends GType[]
                ? ParamsToSignalCallback<Sigs[signal]['param_types']>
                : () => void;
        };

        export type PropsToSignalSignatures<Props extends RegisterClassOptions['Properties']> = {
            [prop in keyof Props as `notify::${prop extends string ? prop : never}`]: (pspec: Props[prop]) => void;
        };

        // Without the conditional it is impossible to implement the property as an accessor instead of a property
        type PropertyCasings<T> = SnakeToCamel<T> & SnakeToUnderscore<T> & T;

        type TypeOnlyProperties<T> = PropertyCasings<{
            [K in keyof T]: T[K] extends { param_type: string; type: infer P }
                ? P
                : T[K];
        }>;

        type ParamSpecsToProps<T> = PropertyCasings<{
            [K in keyof T]: T[K] extends ParamSpec<infer P> ? P : unknown;
        }>;

        type RegisteredClassFromOptions<Opts extends RegisterClassOptions, ParentSigs> = UnionToIntersection<
            IFacesToGTypes<Opts['Implements'] extends { $gtype: GType }[] ? Opts['Implements'] : never>[number]
        > &
            ParamSpecsToProps<Opts['Properties'] extends undefined ? never : Opts['Properties']> &
            SignalFuncs<
                SigsToSignalSignatures<
                    Opts['Signals'] extends { [key: string]: SignalDefinition } ? Opts['Signals'] : never
                > &
                    PropsToSignalSignatures<
                        Opts['Properties'] extends { [key: string]: ParamSpec } ? Opts['Properties'] : never
                    >,
                ParentSigs
            >;

        type SignalFuncs<S, ParentSigs> = {
            /**
             * Compile-time signal type information.
             *
             * This instance property is generated only for TypeScript type checking.
             * It is not defined at runtime and should not be accessed in JS code.
             */
            $signals: S & ParentSigs;

            connect<K extends keyof S, T>(this: T, signal: K, callback: GObject.SignalCallback<T, S[K]>): number;
            connect(signal: string, callback: any): number;
            connect_after<K extends keyof S, T>(this: T, signal: K, callback: GObject.SignalCallback<T, S[K]>): number;
            connect_after(signal: string, callback: any): number;
            emit<K extends keyof S>(
                signal: K,
                ...args: S[K] extends (...args: any[]) => any ? Parameters<S[K]> : any[]
            ): void;
        };

        type RegisteredClassFromType<Opts extends TypeOnlyRegisterClassOptions, ParentSigs> = TypeOnlyProperties<
            Opts['Properties']
        > &
            SignalFuncs<TypeOnlySignals<Opts['Signals']>, ParentSigs>;

        type TypeOnlySignals<T extends TypeOnlyRegisterClassOptions['Signals']> = {
            [K in keyof T]: T[K] extends (...args: object[]) => object | void
                ? T[K]
                : T[K] extends [...args: object[]]
                  ? (...args: T[K]) => void
                  : never;
        };

        export type RegisteredClass<
            Opts extends RegisterClassOptions | TypeOnlyRegisterClassOptions,
            ParentSigs = {},
        > = Opts extends TypeOnlyRegisterClassOptions
            ? RegisteredClassFromType<Opts, ParentSigs>
            : Opts extends RegisterClassOptions
              ? RegisteredClassFromOptions<Opts, ParentSigs>
              : never;

        export type ObjectConstructor = new (...args: any[]) => Object;

        // Standard registerClass overloads
        export function registerClass<Class extends ObjectConstructor>(
            options: RegisterClassOptions,
            cls: Class,
        ): new <Opts extends MetaInfo = {}>(
            ...args: ConstructorParameters<Class>
        ) => InstanceType<Class> & RegisteredClass<Opts>;

        export function registerClass<Class extends ObjectConstructor>(
            cls: Class,
        ): new <Opts extends MetaInfo = {}>(
            ...args: ConstructorParameters<Class>
        ) => InstanceType<Class> & RegisteredClass<Opts>;
    }
}
