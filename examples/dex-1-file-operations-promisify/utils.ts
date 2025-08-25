#!/usr/bin/env -S gjs -m

import Dex from "gi://Dex";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

Gio._promisify(Gio.File.prototype, "replace_contents_async", "replace_contents_finish");

/**
 * Utility functions for working with a hybrid Dex/GIO approach in GJS
 * This module provides helper functions to bridge the gap between different async patterns:
 * - Dex C-style APIs converted to Promises
 * - GIO async methods promisified for consistent async/await usage
 */

/**
 * Promisifies GIO's replace_contents_async method to work with async/await.
 * This function handles the conversion from string to Uint8Array and manages
 * the async operation lifecycle.
 *
 * @param file - The GIO file to write to
 * @param contents - The string content to write
 * @returns Promise that resolves with the string content
 *
 * @example
 * ```typescript
 * await replaceFileContents(file, "Hello World");
 * ```
 */
export async function replaceFileContents(file: Gio.File, contents: string): Promise<string> {
	const encoder = new TextEncoder();
	const uint8Array = encoder.encode(contents);

	return await file.replace_contents_async(uint8Array, null, false, Gio.FileCreateFlags.NONE, null);
}

/**
 * Converts a Dex Future to a JavaScript Promise for use with async/await.
 * This function polls the Future status and resolves/rejects the Promise accordingly.
 * Note: This is a workaround for using Dex in GJS, as Dex.await methods only work
 * in Dex fibers, not in regular GJS async/await contexts.
 *
 * @param future - The Dex Future to promisify
 * @param expectedType - The expected return type to determine which await method to use
 * @returns Promise that resolves with the Future result or rejects with an error
 *
 * @example
 * ```typescript
 * // For boolean results:
 * const success = await promisifyDexFuture(copyFuture, 'boolean');
 *
 * // For GBoxed results:
 * const contents = await promisifyDexFuture(loadFuture, 'boxed');
 *
 * // For integer results:
 * const count = await promisifyDexFuture(countFuture, 'int');
 * ```
 */
export function promisifyDexFuture<T>(
	future: Dex.Future,
	expectedType:
		| "boolean"
		| "boxed"
		| "int"
		| "int64"
		| "uint"
		| "uint64"
		| "double"
		| "float"
		| "string"
		| "object"
		| "variant"
		| "pointer"
		| "enum"
		| "flags",
): Promise<T> {
	return new Promise((resolve, reject) => {
		// Polling approach: Check Future status regularly
		const checkFuture = (): boolean => {
			try {
				const status = future.get_status();

				switch (status) {
					case Dex.FutureStatus.PENDING:
						// Future still running - check again later
						GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, checkFuture);
						return GLib.SOURCE_REMOVE;

					case Dex.FutureStatus.RESOLVED:
						// Future successful - extract result using the appropriate method
						try {
							let result: T;

							switch (expectedType) {
								case "boolean":
									result = future.await_boolean() as T;
									break;
								case "boxed":
									result = future.await_boxed() as T;
									break;
								case "int":
									result = future.await_int() as T;
									break;
								case "int64":
									result = future.await_int64() as T;
									break;
								case "uint":
									result = future.await_uint() as T;
									break;
								case "uint64":
									result = future.await_uint64() as T;
									break;
								case "double":
									result = future.await_double() as T;
									break;
								case "float":
									result = future.await_float() as T;
									break;
								case "string":
									result = future.await_string() as T;
									break;
								case "object":
									result = future.await_object() as T;
									break;
								case "variant":
									result = future.await_variant() as T;
									break;
								case "pointer":
									result = future.await_pointer() as T;
									break;
								case "enum":
									result = future.await_enum() as T;
									break;
								case "flags":
									result = future.await_flags() as T;
									break;
								default:
									throw new Error(`Unknown expected type: ${expectedType}`);
							}

							resolve(result);
						} catch (error) {
							reject(new Error(`Failed to extract Dex Future result: ${error}`));
						}
						return GLib.SOURCE_REMOVE;

					case Dex.FutureStatus.REJECTED:
						// Future failed
						reject(new Error("Dex future rejected"));
						return GLib.SOURCE_REMOVE;

					default:
						reject(new Error(`Unknown future status: ${status}`));
						return GLib.SOURCE_REMOVE;
				}
			} catch (error) {
				reject(new Error(`Error checking future status: ${error}`));
				return GLib.SOURCE_REMOVE;
			}
		};

		// Start the status checking
		checkFuture();
	});
}
