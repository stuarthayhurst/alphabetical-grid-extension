SHELL=bash
UUID=AlphabeticalAppGrid@stuarthayhurst

.PHONY: build release translations install uninstall clean

build:
	glib-compile-schemas schemas
	gnome-extensions pack --force --podir=po --extra-source=LICENSE.txt --extra-source=prefs.ui --extra-source=prefs-gtk4.ui --extra-source=docs/icon.svg
release:
	$(MAKE) gtk4
	$(MAKE) translations
	$(MAKE) build
	if [[ "$$(stat -c %s AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip)" -gt 4096000 ]]; then \
	  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB!"; \
	  exit 1; \
	fi
translations:
	./scripts/update-pot.sh
	./scripts/update-po.sh -a
gtk4:
	gtk4-builder-tool simplify --3to4 prefs.ui > prefs-gtk4.ui
install:
	gnome-extensions install "$(UUID).shell-extension.zip" --force
uninstall:
	gnome-extensions uninstall "$(UUID)"
clean:
	rm -rf locale schemas/gschemas.compiled po/*.po~ prefs.ui~ "$(UUID).shell-extension.zip"
