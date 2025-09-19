#!/bin/bash

# Script to generate missing .gir files for .typelib files in ./girs
# Only generates .gir files that don't already exist
# Author: AI Assistant

# Note: Not using 'set -e' to prevent script termination on individual g-ir-generate failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/girs"

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
    local missing_tools=()

    if ! command -v g-ir-generate &> /dev/null; then
        missing_tools+=("g-ir-generate")
    fi

    if ! command -v find &> /dev/null; then
        missing_tools+=("find")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install GObject Introspection tools:"
        log_error "  Ubuntu/Debian: sudo apt install gobject-introspection"
        log_error "  Fedora: sudo dnf install gobject-introspection-devel"
        log_error "  Arch: sudo pacman -S gobject-introspection"
        exit 1
    fi
}

# Check if source directory exists
check_source_directory() {
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "Source directory does not exist: $SOURCE_DIR"
        log_error "Please run sync-typelibs-to-girs.sh first to populate the directory"
        exit 1
    fi

    log_info "Using source directory: $SOURCE_DIR"
}

# Generate missing .gir files
generate_missing_girs() {
    log_info "Searching for .typelib files that need .gir generation..."

    local typelib_files
    mapfile -t typelib_files < <(find "$SOURCE_DIR" -name "*.typelib" 2>/dev/null)

    if [ ${#typelib_files[@]} -eq 0 ]; then
        log_warning "No .typelib files found in $SOURCE_DIR"
        return 1
    fi

    log_info "Found ${#typelib_files[@]} .typelib files to check"

    local generated=0
    local skipped=0
    local failed=0

    for typelib_file in "${typelib_files[@]}"; do
        # Extract namespace and version from filename
        local filename=$(basename "$typelib_file" .typelib)
        local gir_file="$SOURCE_DIR/$filename.gir"

        # Check if .gir file already exists
        if [ -f "$gir_file" ]; then
            ((skipped++))
            continue
        fi

        # Generate .gir file
        log_info "Generating .gir for $filename..."

        # Run g-ir-generate and capture exit code
        local generate_output
        generate_output=$(GI_TYPELIB_PATH="$SOURCE_DIR" g-ir-generate "$typelib_file" > "$gir_file" 2>&1)
        local generate_exit_code=$?

        if [ $generate_exit_code -eq 0 ] && [ -f "$gir_file" ] && [ -s "$gir_file" ]; then
            log_success "Generated $filename.gir"
            ((generated++))
        else
            log_error "Failed to generate .gir for $filename (exit code: $generate_exit_code)"
            if [ -n "$generate_output" ]; then
                log_error "Error details: $generate_output"
            fi
            # Clean up failed file
            rm -f "$gir_file"
            ((failed++))
        fi
    done

    log_success "Summary: $generated generated, $skipped skipped, $failed failed"
    return 0
}

# Show summary
show_summary() {
    log_info "=== GENERATION SUMMARY ==="
    echo "Source directory: $SOURCE_DIR"

    if [ -d "$SOURCE_DIR" ]; then
        local typelib_count=$(find "$SOURCE_DIR" -name "*.typelib" 2>/dev/null | wc -l)
        local gir_count=$(find "$SOURCE_DIR" -name "*.gir" 2>/dev/null | wc -l)

        echo ".typelib files: $typelib_count"
        echo ".gir files: $gir_count"

        if [ $typelib_count -gt 0 ]; then
            echo "Space used: $(du -sh "$SOURCE_DIR" 2>/dev/null | cut -f1)"
        fi

        if [ $typelib_count -gt 0 ] && [ $gir_count -gt 0 ]; then
            local coverage=$((gir_count * 100 / typelib_count))
            echo "Coverage: $coverage% ($gir_count/$typelib_count .gir files generated)"
        fi
    fi
}

# Main execution
main() {
    log_info "Starting missing .gir file generation..."
    log_info "Script directory: $SCRIPT_DIR"
    log_info "Source directory: $SOURCE_DIR"

    check_dependencies
    check_source_directory

    if generate_missing_girs; then
        show_summary
        log_success "Generation process completed!"
    else
        log_warning "No .typelib files to process"
    fi
}

# Handle script interruption
trap 'log_error "Script interrupted by user"; exit 1' INT TERM

# Function to handle errors gracefully
handle_error() {
    local exit_code=$?
    log_error "Script failed with exit code $exit_code"
    exit $exit_code
}

# Run main function
main "$@"
