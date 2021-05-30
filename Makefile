SHELL=bash
UUID=AlphabeticalAppGrid@stuarthayhurst

.PHONY: build release translations install uninstall clean

build:
	./scripts/compile-locales.sh
	glib-compile-schemas schemas
	gnome-extensions pack --force --extra-source=LICENSE.txt
release:
	$(MAKE) translations
	$(MAKE) build
	if [[ "$$(stat -c %s AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip)" -gt 4096000 ]]; then \
	  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB!"; \
	  exit 1; \
	fi
translations:
	./scripts/update-pot.sh
	./scripts/update-po.sh -a
install:
	gnome-extensions install "$(UUID).shell-extension.zip" --force
uninstall:
	gnome-extensions uninstall "$(UUID)"
clean:
	rm -rf locale "$(UUID).shell-extension.zip"
