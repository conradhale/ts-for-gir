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
 * Enhanced with proper error handling and cleanup using Dex.Future.catch() and finally().
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
		// Use Dex.Future.catch() for proper error handling
		const errorHandledFuture = Dex.Future.catch(future, (errorFuture) => {
			try {
				const errorValue = errorFuture.get_value();
				const errorMessage = errorValue ? String(errorValue) : "Dex operation failed";
				reject(new Error(errorMessage));
			} catch (extractError) {
				reject(new Error(`Failed to extract error: ${extractError}`));
			}
			return errorFuture;
		});

		// Use Dex.Future.then() for success handling
		const successHandledFuture = Dex.Future.then(errorHandledFuture, (resolvedFuture) => {
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

		// Use Dex.Future.finally() for cleanup (optional, but good practice)
		Dex.Future.finally(successHandledFuture, (finalFuture) => {
			// This will be called regardless of success or failure
			// Useful for logging or cleanup operations
			return finalFuture;
		});
	});
}

/**
 * Executes multiple Dex futures in parallel and returns a Promise that resolves
 * when all futures complete. Uses Dex.Future.all() for efficient parallel execution.
 *
 * This is useful for operations like copying multiple files simultaneously
 * or performing other parallel file operations.
 *
 * @param futures - Array of Dex futures to execute in parallel
 * @param expectedTypes - Array of expected return types for each future
 * @returns Promise that resolves with an array of results
 *
 * @example
 * ```typescript
 * const copyFuture1 = Dex.file_copy(file1, dest1, flags, priority);
 * const copyFuture2 = Dex.file_copy(file2, dest2, flags, priority);
 *
 * const results = await promisifyDexFutures(
 *   [copyFuture1, copyFuture2],
 *   ['boolean', 'boolean']
 * );
 * // results = [true, true]
 * ```
 */
export function promisifyDexFutures<T extends readonly unknown[]>(
	futures: Dex.Future[],
	expectedTypes: {
		[K in keyof T]:
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
			| "flags";
	},
): Promise<T> {
	return new Promise((resolve, reject) => {
		// Use Dex.Future.all() to execute all futures in parallel
		const allFutures = Dex.Future.all(futures);

		// Handle errors with catch
		const errorHandledFuture = Dex.Future.catch(allFutures, (errorFuture) => {
			try {
				const errorValue = errorFuture.get_value();
				const errorMessage = errorValue ? String(errorValue) : "One or more parallel operations failed";
				reject(new Error(errorMessage));
			} catch (extractError) {
				reject(new Error(`Failed to extract parallel operation error: ${extractError}`));
			}
			return errorFuture;
		});

		// Handle success with then
		Dex.Future.then(errorHandledFuture, (resolvedFuture) => {
			try {
				// For parallel operations, we need to extract results from each individual future
				// Since Dex.Future.all() returns a FutureSet, we need to handle it differently
				const results: unknown[] = [];

				// Extract results from each future in the set
				for (let i = 0; i < futures.length; i++) {
					const future = futures[i];
					const expectedType = expectedTypes[i];

					if (future.get_status() === Dex.FutureStatus.RESOLVED) {
						let result: unknown;

						switch (expectedType) {
							case "boolean":
								result = future.await_boolean();
								break;
							case "boxed":
								result = future.await_boxed();
								break;
							case "int":
								result = future.await_int();
								break;
							case "int64":
								result = future.await_int64();
								break;
							case "uint":
								result = future.await_uint();
								break;
							case "uint64":
								result = future.await_uint64();
								break;
							case "double":
								result = future.await_double();
								break;
							case "float":
								result = future.await_float();
								break;
							case "string":
								result = future.await_string();
								break;
							case "object":
								result = future.await_object();
								break;
							case "variant":
								result = future.await_variant();
								break;
							case "pointer":
								result = future.await_pointer();
								break;
							case "enum":
								result = future.await_enum();
								break;
							case "flags":
								result = future.await_flags();
								break;
							default:
								throw new Error(`Unknown expected type: ${expectedType}`);
						}

						results.push(result);
					} else {
						reject(new Error(`Future at index ${i} is not resolved`));
						return resolvedFuture;
					}
				}

				resolve(results as unknown as T);
			} catch (error) {
				reject(new Error(`Failed to extract parallel operation results: ${error}`));
			}

			return resolvedFuture;
		});
	});
}
