SHELL=bash
UUID=AlphabeticalAppGrid@stuarthayhurst

.PHONY: build check release translations gtk4 install uninstall clean

build: gtk4
	glib-compile-schemas schemas
	$(MAKE) package
package:
	gnome-extensions pack --force --podir=po --extra-source=LICENSE.txt --extra-source=docs/CHANGELOG.md --extra-source=ui/prefs.ui --extra-source=ui/prefs-gtk4.ui --extra-source=docs/icon.svg
check:
	if [[ ! -f "$(UUID).shell-extension.zip" ]]; then \
	  echo -e "WARNING! Extension zip couldn't be found"; exit 1; \
	fi
	if [[ "$$(stat -c %s $(UUID).shell-extension.zip)" -gt 4096000 ]]; then \
	  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB"; exit 1; \
	fi
	if grep '"debug": true' metadata.json > /dev/null; then \
	  echo -e "\nWARNING! Debug mode is enabled, a release shouldn't be published"; exit 1; \
	fi
release:
	$(MAKE) gtk4
	$(MAKE) translations
	$(MAKE) package
	$(MAKE) check
translations:
	./scripts/update-pot.sh
	./scripts/update-po.sh -a
gtk4:
	gtk4-builder-tool simplify --3to4 ui/prefs.ui > ui/prefs-gtk4.ui
install:
	gnome-extensions install "$(UUID).shell-extension.zip" --force
uninstall:
	gnome-extensions uninstall "$(UUID)"
clean:
	rm -rf locale schemas/gschemas.compiled po/*.po~ *.ui~ ui/*.ui~ "$(UUID).shell-extension.zip"
