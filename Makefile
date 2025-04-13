# Makefile to generate icons from SVG at various sizes.

.PHONY: all clean

IMG_CMD = convert
ifeq ($(OS),Windows_NT)
	IMG_CMD = magick
endif

# List of icon sizes (width x height).
SIZES = 16 24 32 64 128 192

# Source file.
# SRC = public/icon.svg
SRC = public/viture.png

# Default target: generate all icons.
all: $(foreach size, $(SIZES), icon-$(size)x$(size).png) favicon.ico

# Pattern rule: convert "icon-16x16.png" by splitting out "16" and "16".
icon-%.png:
	$(IMG_CMD) $(SRC) -resize $* public/$@
# inkscape -w $(word 1,$(subst x, ,$*)) -h $(word 2,$(subst x, ,$*)) $(SRC) -o public/$@

favicon.ico:
	$(IMG_CMD) public/icon-16x16.png public/icon-24x24.png public/icon-32x32.png public/icon-64x64.png public/favicon.ico

# Clean up generated icons.
clean:
	rm -f public/icon-*.png
