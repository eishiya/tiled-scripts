/* 	Delete Collisions by eishiya, last updated 18 Jul 2023

	Adds an action to the Tileset right-click menu that deletes collisions
	from the selected Tiles.
*/

var deleteCollisions = tiled.registerAction("DeleteCollisions", function(action) {	
	let tileset = tiled.activeAsset;
	if(!tileset || !tileset.isTileset)
		return;
	
	let tiles = tileset.selectedTiles; //To clear from ALL tiles, use tileset.tiles instead
	if(!tiles || tiles.length < 1)
		return;
	
	tileset.macro("Delete Collisions", function() {
		let numTiles = tiles.length;
		for(let i = 0; i < numTiles; i++) {
			tiles[i].objectGroup = null;
		}
	});

});
deleteCollisions.text = "Delete Collisions";

//Only show this action in the Tileset editor:
deleteCollisions.onAssetChanged = function() {
	let asset = tiled.activeAsset;
	if(asset && asset.isTileset) {
		deleteCollisions.enabled = true;
		deleteCollisions.visible = true;
	} else {
		deleteCollisions.enabled = false;
		deleteCollisions.visible = false;
	}
}

deleteCollisions.onAssetChanged(); //Make sure the actions have the correct state on load
tiled.activeAssetChanged.connect(deleteCollisions.onAssetChanged);

//Tileset right-click menu:
//This also adds them to the Tilesets panel's menu where they don't work, which is why we hide the actions for non-tileset documents
tiled.extendMenu("TilesetView.Tiles", [
	{ separator: true },
	{ action: "DeleteCollisions"}
]);
