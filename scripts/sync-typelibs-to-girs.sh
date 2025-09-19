#!/bin/bash

# Script to copy system .typelib files to ./girs with timestamp comparison
# Only copies files that are newer than existing ones
# Author: AI Assistant

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/girs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are available
check_dependencies() {
    if ! command -v find &> /dev/null; then
        log_error "Required tool 'find' not found"
        exit 1
    fi
}

# Create target directory if it doesn't exist
setup_directory() {
    if [ ! -d "$TARGET_DIR" ]; then
        log_info "Creating target directory: $TARGET_DIR"
        mkdir -p "$TARGET_DIR"
        log_success "Directory created"
    else
        log_info "Using existing target directory: $TARGET_DIR"
    fi
}

# Find and copy .typelib files with timestamp comparison
sync_typelib_files() {
    log_info "Searching for system .typelib files..."

    # Find all .typelib files system-wide
    local system_typelibs
    mapfile -t system_typelibs < <(sudo find /usr /opt /var /lib -name "*.typelib" 2>/dev/null | grep -v -E "(cache|tmp|log|run)" || true)

    if [ ${#system_typelibs[@]} -eq 0 ]; then
        log_warning "No system .typelib files found"
        return 0
    fi

    log_info "Found ${#system_typelibs[@]} system .typelib files"

    local copied=0
    local skipped=0
    local updated=0

    for typelib_path in "${system_typelibs[@]}"; do
        local filename=$(basename "$typelib_path")
        local target_file="$TARGET_DIR/$filename"

        if [ -f "$target_file" ]; then
            # Compare timestamps
            if [ "$typelib_path" -nt "$target_file" ]; then
                log_info "Updating $filename (newer version found)"
                if sudo cp "$typelib_path" "$target_file" 2>/dev/null; then
                    ((updated++))
                else
                    log_warning "Failed to update: $filename"
                fi
            else
                ((skipped++))
            fi
        else
            log_info "Copying new file: $filename"
            if sudo cp "$typelib_path" "$target_file" 2>/dev/null; then
                ((copied++))
            else
                log_warning "Failed to copy: $filename"
            fi
        fi
    done

    log_success "Summary: $copied new files copied, $updated files updated, $skipped files skipped"
    return 0
}

# Show summary
show_summary() {
    log_info "=== COPY SUMMARY ==="
    echo "Target directory: $TARGET_DIR"

    if [ -d "$TARGET_DIR" ]; then
        local typelib_count=$(find "$TARGET_DIR" -name "*.typelib" 2>/dev/null | wc -l)
        echo ".typelib files in target: $typelib_count"

        if [ $typelib_count -gt 0 ]; then
            echo "Space used: $(du -sh "$TARGET_DIR" 2>/dev/null | cut -f1)"
        fi
    fi
}

# Main execution
main() {
    log_info "Starting .typelib synchronization to ./girs..."
    log_info "Script directory: $SCRIPT_DIR"
    log_info "Target directory: $TARGET_DIR"

    check_dependencies
    setup_directory

    if sync_typelib_files; then
        show_summary
        log_success "Synchronization completed successfully!"
    else
        log_error "Synchronization failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Script interrupted by user"; exit 1' INT TERM

# Run main function
main "$@"
