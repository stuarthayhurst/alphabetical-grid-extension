SHELL = bash
UUID = AlphabeticalAppGrid@stuarthayhurst
COMPRESSLEVEL = -o7

PNG_FILES = $(wildcard ./docs/*.png)

.PHONY: build package check release translations gtk4 compress install uninstall clean $(PNG_FILES)

build: clean
	glib-compile-schemas extension/schemas
	$(MAKE) package
package:
	cd "extension"; \
	gnome-extensions pack --force --podir=po --extra-source=../LICENSE.txt --extra-source=../docs/CHANGELOG.md --extra-source=../docs/icon.svg --extra-source=credits.json --extra-source=ui --extra-source=lib; \
	mv "$(UUID).shell-extension.zip" ../
check:
	@if [[ ! -f "$(UUID).shell-extension.zip" ]]; then \
	  echo -e "WARNING! Extension zip couldn't be found"; exit 1; \
	elif [[ "$$(stat -c %s $(UUID).shell-extension.zip)" -gt 4096000 ]]; then \
	  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB"; exit 1; \
	elif grep '"debug": true' extension/metadata.json > /dev/null; then \
	  echo -e "\nWARNING! Debug mode is enabled, a release shouldn't be published"; exit 1; \
	fi
release:
	@if [[ "$(VERSION)" != "" ]]; then \
	  sed -i "s|  \"version\":.*|  \"version\": $(VERSION),|g" metadata.json; \
	fi
	#Call other targets required to make a release
	$(MAKE) gtk4
	$(MAKE) translations compress
	$(MAKE) build
	$(MAKE) check
translations:
	./scripts/update-pot.sh
	./scripts/update-po.sh -a
gtk4:
	gtk4-builder-tool simplify --3to4 extension/ui/prefs.ui > extension/ui/prefs-gtk4.ui
	gtk4-builder-tool simplify --3to4 extension/ui/about.ui > extension/ui/about-gtk4.ui
	gtk4-builder-tool simplify --3to4 extension/ui/credits.ui > extension/ui/credits-gtk4.ui
compress:
	$(MAKE) $(PNG_FILES)
$(PNG_FILES):
	optipng "$(COMPRESSLEVEL)" -quiet -strip all "$@"
install:
	@if [[ ! -f "$(UUID).shell-extension.zip" ]]; then \
	  $(MAKE) build; \
	fi
	gnome-extensions install "$(UUID).shell-extension.zip" --force
uninstall:
	gnome-extensions uninstall "$(UUID)"
clean:
	@rm -rfv extension/locale extension/schemas/gschemas.compiled "$(UUID).shell-extension.zip"
	@rm -rfv locale schemas/gschemas.compiled "$(UUID).shell-extension.zip"
	@rm -rfv extension/po/*.po~ extension/*.ui~ extension/ui/*.ui~ extension/ui/*.ui#
	@rm -rfv po/*.po~ *.ui~ ui/*.ui~ ui/*.ui#
