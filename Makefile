SHELL = bash
UUID = AlphabeticalAppGrid@stuarthayhurst
COMPRESSLEVEL ?= -o7

BUILD_DIR ?= build
PNG_FILES = $(wildcard ./docs/*.png)
BUNDLE_PATH = "$(BUILD_DIR)/$(UUID).shell-extension.zip"

.PHONY: build package check release translations compress install uninstall clean $(PNG_FILES)

build: clean
	@mkdir -p $(BUILD_DIR)
	$(MAKE) package
package:
	@mkdir -p $(BUILD_DIR)
	@echo "Packing files..."
	@cd "extension"; \
	gnome-extensions pack --force \
	--podir=po \
	--extra-source=../LICENSE.txt \
	--extra-source=../docs/CHANGELOG.md \
	--extra-source=lib/ \
	-o ../$(BUILD_DIR)/
check:
	@if [[ ! -f $(BUNDLE_PATH) ]]; then \
	  echo "WARNING: Extension zip couldn't be found"; exit 1; \
	elif [[ "$$(stat -c %s $(BUNDLE_PATH))" -gt 4096000 ]]; then \
	  echo "WARNING: Extension zip must stay below 4096 KB"; exit 1; \
	fi
release:
	@if [[ "$(VERSION)" != "" ]]; then \
	  sed -i "s|  \"version\":.*|  \"version\": $(VERSION),|g" extension/metadata.json; \
	fi
	#Call other targets required to make a release
	$(MAKE) translations compress
	$(MAKE) build
	$(MAKE) check
translations:
	@BUILD_DIR=$(BUILD_DIR) ./scripts/update-po.sh -a
compress:
	$(MAKE) $(PNG_FILES)
$(PNG_FILES):
	@echo "Compressing $@..."
	@optipng $(COMPRESSLEVEL) -quiet -strip all "$@"
install:
	@if [[ ! -f $(BUNDLE_PATH) ]]; then \
	  $(MAKE) build; \
	fi
	gnome-extensions install $(BUNDLE_PATH) --force
uninstall:
	gnome-extensions uninstall "$(UUID)"
clean:
	@rm -rfv $(BUILD_DIR)
	@rm -rfv extension/po/*.po~
	@rm -rfv extension/ui/*/*.ui~ extension/ui/*/*.ui#
	@rm -rfv extension/locale extension/schemas/gschemas.compiled "$(UUID).shell-extension.zip"
	@rm -rfv locale schemas/gschemas.compiled
	@rm -rfv extension/*.ui~ extension/*.ui# extension/ui/*.ui~ extension/ui/*.ui#
	@rm -rfv po/*.po~ *.ui~ *.ui# ui/*.ui~ ui/*.ui#
