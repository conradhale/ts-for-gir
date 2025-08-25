#!/usr/bin/env -S gjs -m

import Dex from "gi://Dex";
import type GLib from "gi://GLib";
import type GObject from "gi://GObject";

/**
 * Type definitions for Dex Future return types
 * These types map expectedType strings to their corresponding TypeScript types
 */
export type DexFutureReturnType<T extends string> = T extends "boolean"
	? boolean
	: T extends "int" | "int64" | "uint" | "uint64" | "double" | "float"
		? number
		: T extends "string"
			? string
			: T extends "object"
				? GObject.Object
				: T extends "variant"
					? GLib.Variant
					: T extends "pointer"
						? unknown
						: T extends "enum" | "flags"
							? number
							: T extends "future"
								? Dex.Future
								: T extends "boxed"
									? unknown
									: never;

/**
 * Union type of all valid expectedType values
 */
export type DexFutureExpectedType =
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
	| "flags"
	| "future";

/**
 * Converts a Dex Future to a JavaScript Promise using Dex.Future.then().
 * This function leverages Dex's built-in callback mechanism instead of polling.
 * Enhanced with proper error handling and cleanup using Dex.Future.catch() and finally().
 *
 * The return type is automatically inferred based on the expectedType parameter.
 * The expectedType parameter comes first for better readability and chaining.
 *
 * This utility is part of our hybrid approach where we use Dex for some operations
 * and GIO for others. This function bridges the gap between Dex's Future-based API
 * and modern async/await patterns.
 *
 * @param expectedType - The expected return type to determine which await method to use
 * @param future - The Dex Future to promisify
 * @returns Promise that resolves with the Future result or rejects with an error
 *
 * @example
 * ```typescript
 * // TypeScript automatically infers the correct return type:
 * const success = await promisifyDexFuture('boolean', copyFuture); // Promise<boolean>
 * const count = await promisifyDexFuture('int', countFuture); // Promise<number>
 * const contents = await promisifyDexFuture('boxed', loadFuture); // Promise<unknown>
 * const future = await promisifyDexFuture('future', someFuture); // Promise<Dex.Future>
 *
 * // Can be chained for better readability:
 * await promisifyDexFuture('boolean', Dex.file_make_directory(dir, priority));
 * ```
 */

// Function overloads for automatic type inference
export function promisifyDexFuture<T extends DexFutureExpectedType>(
	expectedType: T,
	future: Dex.Future,
): Promise<DexFutureReturnType<T>>;

// Implementation
export function promisifyDexFuture(expectedType: DexFutureExpectedType, future: Dex.Future): Promise<unknown> {
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
				let result: unknown;

				switch (expectedType) {
					case "boolean":
						result = resolvedFuture.await_boolean();
						break;
					case "boxed":
						result = resolvedFuture.await_boxed();
						break;
					case "int":
						result = resolvedFuture.await_int();
						break;
					case "int64":
						result = resolvedFuture.await_int64();
						break;
					case "uint":
						result = resolvedFuture.await_uint();
						break;
					case "uint64":
						result = resolvedFuture.await_uint64();
						break;
					case "double":
						result = resolvedFuture.await_double();
						break;
					case "float":
						result = resolvedFuture.await_float();
						break;
					case "string":
						result = resolvedFuture.await_string();
						break;
					case "object":
						result = resolvedFuture.await_object();
						break;
					case "variant":
						result = resolvedFuture.await_variant();
						break;
					case "pointer":
						result = resolvedFuture.await_pointer();
						break;
					case "enum":
						result = resolvedFuture.await_enum();
						break;
					case "flags":
						result = resolvedFuture.await_flags();
						break;
					case "future":
						result = resolvedFuture;
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
 * Converts multiple Dex Futures to JavaScript Promises for parallel execution.
 * Uses Dex.Future.all() for concurrent processing with proper error handling.
 *
 * @param expectedTypes - Array of expected return types for each future
 * @param futures - Array of Dex Futures to promisify
 * @returns Promise that resolves with an array of results or rejects with an error
 *
 * @example
 * ```typescript
 * const results = await promisifyDexFutures(
 *   ['boolean', 'int', 'string'],
 *   [future1, future2, future3]
 * );
 * // results is [boolean, number, string]
 * ```
 */
export function promisifyDexFutures<T extends readonly unknown[]>(
	expectedTypes: { [K in keyof T]: DexFutureExpectedType },
	futures: Dex.Future[],
): Promise<T> {
	return new Promise((resolve, reject) => {
		const allFutures = Dex.Future.all(futures);

		const errorHandledFuture = Dex.Future.catch(allFutures, (errorFuture) => {
			try {
				const errorValue = errorFuture.get_value();
				const errorMessage = errorValue ? String(errorValue) : "Parallel Dex operation failed";
				reject(new Error(errorMessage));
			} catch (extractError) {
				reject(new Error(`Failed to extract parallel operation error: ${extractError}`));
			}
			return errorFuture;
		});

		Dex.Future.then(errorHandledFuture, (resolvedFuture) => {
			try {
				const results: unknown[] = [];

				for (let i = 0; i < futures.length; i++) {
					const future = futures[i];
					const expectedType = expectedTypes[i];

					if (future.get_status() === Dex.FutureStatus.RESOLVED) {
						// Extract result using the appropriate method based on expected type
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
							case "future":
								result = future;
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
