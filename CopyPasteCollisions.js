/* 	Copy+Paste Collisions by eishiya, last modified 29 Aug 2023

	This script adds three actions to the Tileset Editor right-click menu
	that let you copy+paste terrains across multiple tiles at once.

	- Copy Collisions
		Copies the collisions of the currently selected tiles.
	- Paste Collisions (Add)
		Pastes the copied collisions to the currently selected tiles, adding
		them to the existing ones.
	- Paste Collisions (Replace)
		Pastes the copied collisions to the currently selected tiles, replacing
		any existing collisions..
	
	Unlike Tiled's built-in collision copy+paste, this allows you to copy+paste
	many different collisions at once.
	
	Occasionally, the Collision Editor will not immediately show the changed
	collisions; you may need to toggle it off and on or change tiles.

	Intended uses:
	A. Many-to-many:
	- Select a group of source tiles, Copy Collisions.
	- Select a group of destination tiles, Paste Collisions.
	  The collisions from each source tile will be pasted to its corresponding
	  destination tile, one pair of tiles at a time, until the list of
	  source tiles or destination tiles runs out.
	
	B. One-to-many:
	This is functionally the same as Tiled's built-in collision copy+paste,
	but may be more convenient.
	- Select a single source tile, Copy Collisions.
	- Select a group of destination tiles, Paste Collisions.
	  The same source collision will apply to all the destination tiles.
	
	You can copy collisions from Tiles without collisions. In this case, Adding
	them will not modify the destination tile, and Replacing will delete the
	collisions on the destination tile. This can be used to clear collisions
	en masse, but my Delete Collisions script would probably be more convenient:
	https://github.com/eishiya/tiled-scripts/blob/main/DeleteCollisions.js
*/

var copyPasteCollisions = {
	clipboard: [], //stores the copied collisions.
	//This is just a list of object groups currently, as selected tiles are given
	//to the scripting API as just a list, with no 2D arrangement information.
	
	//Adds copies of objects from one ObjectGroup to another.
	//This'll even handle text and Tile objects, even though collisions can't have these.
	addObjects: function(src, dst) {
		let objects = src.objects;
		for(let oi = 0; oi < objects.length; ++oi) {
			let curObject = objects[oi];
			let newObject = new MapObject();
			newObject.font = curObject.font;
			newObject.width = curObject.width;
			newObject.height = curObject.height;
			newObject.name = curObject.name;
			newObject.polygon = curObject.polygon;
			newObject.x = curObject.x;
			newObject.y = curObject.y;
			newObject.rotation = curObject.rotation;
			newObject.shape = curObject.shape;
			newObject.text = curObject.text;
			newObject.textAlignment = curObject.textAlignment;
			newObject.textColor = curObject.textColor;
			if(curObject.tile) {
				newObject.tile = curObject.tile;
				newObject.tileFlippedHorizontally = curObject.tileFlippedHorizontally;
				newObject.tileFlippedVertically = curObject.tileFlippedVertically;
			}
			newObject.type = curObject.type;
			newObject.visible = curObject.visible;
			newObject.wordWrap = curObject.wordWrap;
			newObject.setProperties(curObject.properties());
			
			dst.addObject(newObject);
		}
	},
	
	copyCollisions: tiled.registerAction("copyTileCollisions", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to copy collisions.");
			return;
		}
		let tileset = tiled.activeAsset;
		copyPasteCollisions.clipboard.length = 0; //Reset clipboard

		for(tile of tileset.selectedTiles) {
			let oldCollisions = tile.objectGroup;
			if(oldCollisions && oldCollisions.objectCount > 0) {
				let copy = new ObjectGroup();
				copyPasteCollisions.addObjects(oldCollisions, copy);
				copyPasteCollisions.clipboard.push(copy);
			} else {
				copyPasteCollisions.clipboard.push(null);
			}
		}
	}),

	replaceCollisions: tiled.registerAction("pasteTileCollisionsReplace", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to paste collisions.");
			return;
		}
		if(copyPasteCollisions.clipboard.length < 1) {
			tiled.alert("There are no collisions to paste.");
			return;
		}
		let tileset = tiled.activeAsset;
		let selectedTiles = tileset.selectedTiles;

		tileset.macro("Paste Collisions (Replace)", function() {
			for(let ti = 0; ti < selectedTiles.length; ++ti) {
				let src;
				if(copyPasteCollisions.clipboard.length === 1) {
					src = copyPasteCollisions.clipboard[0];
				} else {
					if(ti >= copyPasteCollisions.clipboard.length)
						break;
					src = copyPasteCollisions.clipboard[ti];
				}
				
				let tile = selectedTiles[ti];
				if(src == null)
					tile.objectGroup = null;
				else {
					let dst = new ObjectGroup();
					copyPasteCollisions.addObjects(src, dst);
					tile.objectGroup = dst;
				}
			}
		});
	}),
	
	addCollisions: tiled.registerAction("pasteTileCollisionsAdd", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to paste collisions.");
			return;
		}
		if(copyPasteCollisions.clipboard.length < 1) {
			tiled.alert("There are no collisions to paste.");
			return;
		}
		let tileset = tiled.activeAsset;
		let selectedTiles = tileset.selectedTiles;
		tileset.macro("Paste Collisions (Add)", function() {
			for(let ti = 0; ti < selectedTiles.length; ++ti) {
				let src;
				if(copyPasteCollisions.clipboard.length === 1) {
					src = copyPasteCollisions.clipboard[0];
				} else {
					if(ti >= copyPasteCollisions.clipboard.length)
						break;
					src = copyPasteCollisions.clipboard[ti];
				}
				
				let tile = selectedTiles[ti];
				if(src == null)
					continue; //nothing to add
				else {
					let dst = tile.objectGroup;
					if(!dst) {
						dst = new ObjectGroup();
						tile.objectGroup = dst;
					}
					copyPasteCollisions.addObjects(src, dst);
				}
			}
		});
	})
};

copyPasteCollisions.copyCollisions.text = "Copy Collisions";
copyPasteCollisions.replaceCollisions.text = "Paste Collisions (Replace)";
copyPasteCollisions.addCollisions.text = "Paste Collisions (Add)";

//Only show these action in the Tileset editor:
copyPasteCollisions.onAssetChanged = function() {
	let asset = tiled.activeAsset;
	if(asset && asset.isTileset) {
		copyPasteCollisions.copyCollisions.enabled = true;
		copyPasteCollisions.copyCollisions.visible = true;
		copyPasteCollisions.replaceCollisions.enabled = true;
		copyPasteCollisions.replaceCollisions.visible = true;
		copyPasteCollisions.addCollisions.enabled = true;
		copyPasteCollisions.addCollisions.visible = true;
	} else {
		copyPasteCollisions.copyCollisions.enabled = false;
		copyPasteCollisions.copyCollisions.visible = false;
		copyPasteCollisions.replaceCollisions.enabled = false;
		copyPasteCollisions.replaceCollisions.visible = false;
		copyPasteCollisions.addCollisions.enabled = false;
		copyPasteCollisions.addCollisions.visible = false;
	}
}

copyPasteCollisions.onAssetChanged(); //Make sure the actions have the correct state on load
tiled.activeAssetChanged.connect(copyPasteCollisions.onAssetChanged);

/*
//Tileset menu:
tiled.extendMenu("Tileset", [
	{ action: "copyTileCollisions", before: "TilesetProperties" },
	{ action: "pasteTileCollisionsAdd" },
	{ action: "pasteTileCollisionsReplace" },
	{separator: true}
]);*/

//Tileset right-click menu:
//This also adds them to the Tilesets panel's menu where they don't work, which is why we hide the actions for non-tileset documents
tiled.extendMenu("TilesetView.Tiles", [
	{ separator: true },
	{ action: "copyTileCollisions" },
	{ action: "pasteTileCollisionsAdd" },
	{ action: "pasteTileCollisionsReplace" }
]);
