# Tiled Scripts
Assorted scripts for [Tiled Map Editor](https://www.mapeditor.org/), written by eishiya.

Usage instructions are in the comments at the top of each script. Feel free to use these scripts as you wish. Credit appreciated but not required.

If you're new to using Tiled scripts and don't know how to install them, please see the [Tiled docs on scripting](https://doc.mapeditor.org/en/stable/reference/scripting/#scripted-extensions). Check out more scripts from the Tiled community in [mapeditor/tiled-extensions](https://github.com/mapeditor/tiled-extensions).

Brief descriptions of the scripts in this repo:

### Large Tile Stamp Tool
Draws large tiles spaced out so they don't overlap each other. Right-click to sample tiles.

### Move Tiles Tool
Allows you to move selected tiles by dragging them instead of cut+pasting, similar to image editors' Move tools. Hold shift when starting to move to copy instead of cut. Also allows nudging with the keyboard. Click to commit the move.

### Replace Tile Tool
Replaces a tile with your current brush tile, either in your selected layer(s) or everywhere in the map. Unlike Select Same Tile + Bucket Fill, it reconciles the existing flips with the new ones. If you need to replace a large number of tiles and/or replace tiles across many maps, see the Mass Replace Tiles script.

### Terrain Rectangle Tool
Draws a rectangle using the currently selected terrain. Allows drawing large rectangles using Terrain sets that don't include concave corners and confuse the regular Terrain tools. Ctrl to ignore existing terrains in the map.

### Apply Action to Open Documents
Lets you choose any action in Tiled and run it on every open document. Useful for mass-applying scripted actions without making a separate "apply to all" action for all of them.

### Automap Helper
A collection of several actions to make automapping less tedious.
#### Add/Remove UIDs to/from Selected Layers
Useful to temporarily give layers unique names even when Automapping requires them to be the same, to aid copypasting in multiple layers at once.
#### Generate Automap Layers
Creates multiple input or output layers at once, optionally filling them with tiles from your brush.
#### Convert Brush to Layers
Takes your brush and prepares it for pasting to the Selected Layers, either by renaming the layers of a multi-layer brush to match the selected layers, or (for single-layer brushes) by moving each tile to its own layer, named to match the selected layers. This action makes it possible to multi-layer paste to *different* layers.
#### Toggle //
Adds or removes `//` to/from selected layers' names, either individually or based on the comment state of the bottom layer. Hotkey this to quickly mark layers as ignored for Automapping in Tiled 1.8+.

### Center View on Map
Centres the current map view on the map, useful to quickly go back to a map after panning around a large World.

### Copy+Paste Animations
Copies/pastes tile animations. It can copy the frames exactly, or adjust the frames relative to the destination tile(s).

### Copy+Paste Layers
Copies/pastes entire layers, including their properties along with the content. Can copy/paste multiple layers at once, regardless of layer type.

### Copy+Paste Terrains
Copies/pastes terrains from/to selected tiles. Includes actions to copy/paste terrains exactly, as well as to copy/paste the arrangement of a particular terrain, so you can paste it as a different terrain.

### Count Tiles
Counts the tiles used in a map, useful for e.g. GB Studio where the unique tiles allowed per map are limited, but tilesets may be large. Counts both by ID and by flips.

### Image to Map
Generates a TileMap based on a source image by matching colours from the image to tiles, using user-defined color: tileID pairs. Useful for turning schematic map sketches into TileMaps.

### Import Metatile Terrains
Builds Terrain data for a metatileset by using the Terrain data from the source Tileset. Useful for speeding up Terrain creation for metatilesets, as the source tiles are usually fewer in number and easier to label. Only tested with orthographic tiles.

### Mass Replace Tiles
Replaces tiles en masse, according to a guide map that specifies the tile to replace in an "old" layer and the replacements in a "new" layer. Includes an extra action to run the replacer on all open maps. Useful for when you need to rearrange the tiles in a tileset, or replace an old tileset with a new one that's arranged differently.

### Replace in Layer Name
Renames selected layers by doing a search and replace in their name. Supports regular expressions.

### Select Child Layers
Recursively selects the child layers of all selected groups.

### Spreadsheet Actions
Inserts and deletes rows and columns in your map, making it easier to expand and contract your map. Can also shift Objects over to match.

### Tileset Heatmap
Generates a heatmap of your tileset, making it easy to find over- and under-used tiles.
