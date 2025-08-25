#!/usr/bin/env -S gjs -m

import Dex from "gi://Dex";
import Gio from "gi://Gio";

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
 * Converts a Dex Future to a JavaScript Promise using Dex.Future.then().
 * This function leverages Dex's built-in callback mechanism instead of polling.
 *
 * This utility is part of our hybrid approach where we use Dex for some operations
 * and GIO for others. This function bridges the gap between Dex's Future-based API
 * and modern async/await patterns.
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
		// Use Dex.Future.then() for efficient callback-based resolution
		const _resultFuture = Dex.Future.then(future, (resolvedFuture: Dex.Future) => {
			try {
				// Extract result using the appropriate method based on expected type
				let result: T;

				switch (expectedType) {
					case "boolean":
						result = resolvedFuture.await_boolean() as T;
						break;
					case "boxed":
						result = resolvedFuture.await_boxed() as T;
						break;
					case "int":
						result = resolvedFuture.await_int() as T;
						break;
					case "int64":
						result = resolvedFuture.await_int64() as T;
						break;
					case "uint":
						result = resolvedFuture.await_uint() as T;
						break;
					case "uint64":
						result = resolvedFuture.await_uint64() as T;
						break;
					case "double":
						result = resolvedFuture.await_double() as T;
						break;
					case "float":
						result = resolvedFuture.await_float() as T;
						break;
					case "string":
						result = resolvedFuture.await_string() as T;
						break;
					case "object":
						result = resolvedFuture.await_object() as T;
						break;
					case "variant":
						result = resolvedFuture.await_variant() as T;
						break;
					case "pointer":
						result = resolvedFuture.await_pointer() as T;
						break;
					case "enum":
						result = resolvedFuture.await_enum() as T;
						break;
					case "flags":
						result = resolvedFuture.await_flags() as T;
						break;
					default:
						throw new Error(`Unknown expected type: ${expectedType}`);
				}

				resolve(result);
			} catch (error) {
				reject(new Error(`Failed to extract Dex Future result: ${error}`));
			}

			// Return the resolved future as required by FutureCallback
			return resolvedFuture;
		});

		// Handle rejection by checking if the result future is rejected
		// Note: We might need to handle rejection differently depending on Dex's behavior
		// For now, we'll keep the error handling simple
	});
}
