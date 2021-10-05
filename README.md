# Tiled Scripts
Assorted scripts for Tiled Map Editor, written by eishiya. Usage instructions in the comments.

Feel free to use them as you wish. Credit appreciated but not required.

Brief descriptions of the included scripts:

### Replace Tile Tool
Replaces a tile with your current brush tile, either in your selected layer(s) or everywhere in the map. Unlike Select Same Tile + Bucket Fill, it reconciles the existing flips with the new ones.

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
