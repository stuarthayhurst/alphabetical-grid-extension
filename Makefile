SHELL=bash

JS_FILES = $(shell find -type f -and \( -name "*.js" \))
UI_FILES = $(shell find -type f -and \( -name "*.ui" \))

LOCALES_PO = $(wildcard locale/*/*/*.po)
LOCALES_MO = $(patsubst %.po,%.mo,$(LOCALES_PO))

.PHONY: build release install uninstall all-po clean distclean

build: AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip

release: AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip
	@./scripts/clean-svgs.py
	@if [[ ! -f "AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip" ]]; then \
	  echo -e "WARNING! Extension zip couldn't be found"; exit 1; \
	elif [[ "$$(stat -c %s AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip)" -gt 4096000 ]]; then \
	  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB"; exit 1; \
	elif grep '"debug": true' metadata.json > /dev/null; then \
	  echo -e "\nWARNING! Debug mode is enabled, a release shouldn't be published"; exit 1; \
	fi
	@# TODO Maybe echo version number of the release that was built, in order to facilitate double-checking before publishing it?
	

install: AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip
	gnome-extensions install "AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip" --force

uninstall:
	gnome-extensions uninstall "AlphabeticalAppGrid@stuarthayhurst"

all-po: $(LOCALES_PO)

AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip: schemas/gschemas.compiled build/icon.png $(LOCALES_MO)
	@echo "Packing zip file..."
	@zip $@ $(JS_FILES) $(LOCALES_MO) schemas/gschemas.compiled
	@# The --junk-paths flag puts files in the root of the zip file, even if they are listed with paths here
	@zip --junk-paths $@ $(UI_FILES) metadata.json build/icon.png docs/CHANGELOG.md LICENSE.txt

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.AlphabeticalAppGrid.gschema.xml
	glib-compile-schemas schemas

build/%.png: docs/%.png
	@mkdir -p build
	optipng -o7 -strip all -backup -dir build $<

ui/prefs-gtk4.ui: ui/prefs.ui
	gtk4-builder-tool simplify --3to4 $< > $@

%.mo: %.po locale/messages.pot
	@echo "Compiling $@"
	@msgfmt -c -o $@ $<

%.po : locale/messages.pot
	@echo "Updating $@"
	@msgmerge --previous --update $@ $<

locale/messages.pot: $(JS_FILES) $(UI_FILES)
	@echo "Generating 'messages.pot'..."
	@xgettext --from-code=UTF-8 \
         --add-comments=Translators \
         --copyright-holder="Stuart Hayhurst" \
         --package-name="alphabetical-grid-extension" \
         --output=locale/messages.pot \
         $(JS_FILES) $(UI_FILES)
	@sed -i '1s/.*/# <LANGUAGE> translation for the Alphabetical App Grid GNOME Shell Extension./' locale/messages.pot
	@sed -i "2s/.*/# Copyright (C) $$(date +%Y) Stuart Hayhurst/" locale/messages.pot
	@sed -i '17s/CHARSET/UTF-8/' locale/messages.pot

clean:
	rm -rf \
	AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip \
	schemas/gschemas.compiled \
	build \
	$(LOCALES_MO) \
	locale/*/LC_MESSAGES/AlphabeticalAppGrid@stuarthayhurst.po~ \
	ui/*.ui~
