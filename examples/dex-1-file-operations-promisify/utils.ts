#!/usr/bin/env -S gjs -m

import Gio from "gi://Gio";

Gio._promisify(Gio.File.prototype, "replace_contents_async", "replace_contents_finish");

/**
 * Utility functions for working with a hybrid Dex/GIO approach in GJS
 * This file contains GIO-specific utilities that complement the Dex utilities in promisify.ts
 */

/**
 * Replaces the contents of a file with new content using GIO's async API.
 * This function is promisified using Gio._promisify for modern async/await usage.
 *
 * This utility is part of our hybrid approach where we use Dex for some operations
 * and GIO for others. This function handles file content replacement using GIO.
 *
 * @param file - The Gio.File to modify
 * @param content - The new content as a string
 * @param etag - Optional ETag for conflict detection
 * @param makeBackup - Whether to create a backup before replacing
 * @param flags - File creation flags
 * @param cancellable - Optional cancellable object
 * @returns Promise that resolves when the operation completes
 */
export async function replaceFileContents(
	file: Gio.File,
	content: string,
	etag?: string | null,
	makeBackup = false,
	flags = Gio.FileCreateFlags.NONE,
	cancellable?: Gio.Cancellable | null,
): Promise<void> {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(content);

	await file.replace_contents_async(bytes, etag ?? null, makeBackup, flags, cancellable);
}
