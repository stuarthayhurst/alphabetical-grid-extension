SHELL = bash
UUID = alphabetical-app-grid@stuarthayhurst
COMPRESSLEVEL ?= -o7

BUILD_DIR ?= build
PNG_FILES = $(wildcard ./docs/*.png)
BUNDLE_PATH = "$(BUILD_DIR)/$(UUID).shell-extension.zip"

.PHONY: build package check release translations compress install uninstall clean $(PNG_FILES)

# Build the extension
build:
	@echo "Creating build directory..."
	@mkdir -p $(BUILD_DIR)
	$(MAKE) package

# Package the extension
package:
	@echo "Packing extension files..."
	@mkdir -p $(BUILD_DIR)
	@cd "extension"; \
	gnome-extensions pack --force \
		--podir=po \
		--extra-source=../LICENSE.txt \
		--extra-source=../docs/CHANGELOG.md \
		--extra-source=lib/ \
		-o ../$(BUILD_DIR)/

# Verify the packaged extension
check:
		@if [[ ! -f $(BUNDLE_PATH) ]]; then \
		  echo -e "\nERROR: Extension zip could not be found."; exit 1; \
		elif [[ "$$(stat -c %s $(BUNDLE_PATH))" -gt 4096000 ]]; then \
		  echo -e "\nERROR: Extension size exceeds 4096 KB; reduce the size before uploading."; exit 1; \
		elif grep '"debug": true' extension/metadata.json > /dev/null; then \
		  echo -e "\nERROR: Debug mode is enabled; disable it for a production release."; exit 1; \
		fi

# Prepare for a release
release:
		@if [[ "$(VERSION)" != "" ]]; then \
		  sed -i "s|  \"version\":.*|  \"version\": $(VERSION),|g" extension/metadata.json; \
		fi
		@echo "Preparing release..."
		$(MAKE) translations compress
		$(MAKE) build
		$(MAKE) check

# Update translations
translations:
		@echo "Updating translations..."
		@BUILD_DIR=$(BUILD_DIR) ./scripts/update-po.sh -a

# Compress PNG files
compress:
	@$(MAKE) $(PNG_FILES)

$(PNG_FILES):
		@echo "Compressing $@..."
		@optipng $(COMPRESSLEVEL) -quiet -strip all "$@"

# Install the extension locally
install:
		@if [[ ! -f $(BUNDLE_PATH) ]]; then \
		  $(MAKE) build; \
		fi
		@echo "Installing the extension..."
		gnome-extensions install $(BUNDLE_PATH) --force

# Uninstall the extension
uninstall:
		@echo "Uninstalling the extension..."
		gnome-extensions uninstall "$(UUID)"

# Clean build artifacts
clean:
		@echo "Cleaning up build artifacts..."
		@rm -rfv $(BUILD_DIR)
		@rm -rfv extension/po/*.po~
		@rm -rfv extension/ui/*/*.ui~ extension/ui/*/*.ui#
		@rm -rfv extension/locale extension/schemas/gschemas.compiled "$(UUID).shell-extension.zip"
		@rm -rfv locale schemas/gschemas.compiled
		@rm -rfv extension/*.ui~ extension/*.ui# extension/ui/*.ui~ extension/ui/*.ui#
		@rm -rfv po/*.po~ *.ui~ *.ui# ui/*.ui~ ui/*.ui#
