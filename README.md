# Tiled Scripts
Assorted scripts for Tiled Map Editor, written by eishiya.

Usage instructions are in the comments at the top of each script. Feel free to use these scripts as you wish. Credit appreciated but not required.

If you're new to using Tiled scripts and don't know how to install them, please see the [Tiled docs on scripting](https://doc.mapeditor.org/en/stable/reference/scripting/#scripted-extensions).

Brief descriptions of the included scripts:

### Move Tiles Tool
Allows you to move selected tiles by dragging them instead of cut+pasting, similar to image editors' Move tools. Hold shift when starting to move to copy instead of cut. Also allows nudging with the keyboard. Click to commit the move.

### Replace Tile Tool
Replaces a tile with your current brush tile, either in your selected layer(s) or everywhere in the map. Unlike Select Same Tile + Bucket Fill, it reconciles the existing flips with the new ones. If you need to replace a large number of tiles and/or replace tiles across many maps, see the Mass Replace Tiles script.

**Warning**: The Replace Tile Tool currently ignores layers within groups, and does not work correctly on infinite maps.

### Automap Helper
A collection of several scripts to make automapping less tedious.
#### Add/Remove UIDs to/from Selected Layers
Useful to temporarily give layers unique names even when Automapping requires them to be the same, to aid copypasting in multiple layers at once.
#### Generate Automap Layers
Creates multiple input or output layers at once, optionally filling them with tiles from your brush.
#### Convert Brush to Layers
Takes your brush and prepares it for pasting to the Selected Layers, either by renaming the layers of a multi-layer brush to match the selected layers, or (for single-layer brushes) by moving each tile to its own layer, named to match the selected layers. This action makes it possible to multi-layer paste to *different* layers.

### Center View on Map
Centres the current map view on the map, useful to quickly go back to a map after panning around a large World.

### Count Tiles
Counts the tiles used in a map, useful for e.g. GB Studio where the unique tiles allowed per map are limited, but tilesets may be large. Counts both by ID and by flips.

### Image to Map
Generates a TileMap based on a source image by matching colours from the image to tiles, using user-defined color: tileID pairs. Useful for turning schematic map sketches into TileMaps.

### Mass Replace Tiles
Replaces tiles en masse, according to a guide map that specifies the tile to replace in an "old" layer and the replacements in a "new" layer. Includes an extra action to run the replacer on all open maps. Useful for when you need to rearrange the tiles in a tileset, or replace an old tileset with a new one that's arranged differently.
