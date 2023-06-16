SHELL = bash
UUID = AlphabeticalAppGrid@stuarthayhurst
COMPRESSLEVEL ?= -o7

BUILD_DIR ?= build
UI_FILES = $(wildcard ./extension/ui/gtk3/*.ui)
PNG_FILES = $(wildcard ./docs/*.png)
BUNDLE_PATH = "$(BUILD_DIR)/$(UUID).shell-extension.zip"

.PHONY: build package check release translations gtk4 compress install uninstall clean $(UI_FILES) $(PNG_FILES)

build: clean
	@mkdir -p $(BUILD_DIR)
	glib-compile-schemas --strict extension/schemas --targetdir $(BUILD_DIR)
	$(MAKE) package
package:
	@mkdir -p $(BUILD_DIR)
	@echo "Packing files..."
	@cd "extension"; \
	gnome-extensions pack --force \
	--podir=po \
	--extra-source=../LICENSE.txt \
	--extra-source=../docs/CHANGELOG.md \
	--extra-source=../docs/icon.svg \
	--extra-source=credits.json \
	--extra-source=ui/ \
	--extra-source=lib/ \
	-o ../$(BUILD_DIR)/
check:
	@if [[ ! -f $(BUNDLE_PATH) ]]; then \
	  echo -e "\nWARNING! Extension zip couldn't be found"; exit 1; \
	elif [[ "$$(stat -c %s $(BUNDLE_PATH))" -gt 4096000 ]]; then \
	  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB"; exit 1; \
	elif grep '"debug": true' extension/metadata.json > /dev/null; then \
	  echo -e "\nWARNING! Debug mode is enabled, a release shouldn't be published"; exit 1; \
	fi
release:
	@if [[ "$(VERSION)" != "" ]]; then \
	  sed -i "s|  \"version\":.*|  \"version\": $(VERSION),|g" extension/metadata.json; \
	fi
	#Call other targets required to make a release
	$(MAKE) gtk4
	$(MAKE) translations compress
	$(MAKE) build
	$(MAKE) check
translations:
	@./scripts/update-pot.sh
	@./scripts/update-po.sh -a
gtk4:
	@$(MAKE) $(UI_FILES)
$(UI_FILES):
	@fileNameGtk4=$@; \
	fileNameGtk4="$${fileNameGtk4//gtk3/gtk4}"; \
	echo "Cleaning $@"; \
	gtk-builder-tool simplify --replace "$@"; \
	echo "Converting $@ -> $$fileNameGtk4"; \
	gtk4-builder-tool simplify --3to4 "$@" > "$$fileNameGtk4"
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
