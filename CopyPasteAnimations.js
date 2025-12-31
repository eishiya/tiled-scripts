/* 	Copy+Paste Animations by eishiya, last updated 31 Dec 2025

	Adds actions to the Tileset menu and tile right-click menus to
	Copy, Cut, and Paste Animations between tiles.
	
	Note that Cutting is *immediate*, if you don't paste it, that data will be
	gone forever (unless you Undo or paste it back where it was).
	An upshot of this is if you Cut without pasting, you can quickly clear
	the animation(s).
	
	In addition, multiple Paste Modes are supported, which you can change by
	clicking the "Paste mode: ..." action in the Tileset menu.
	  - Exact: keep the animation entirely unchanged, just copy it
		to the target tile.
	  - Adjust ID: adjust each frame's tile ID by the difference between
		the source tile's ID and destination tile's ID.
	  - Adjust Position: adjust each frame's tile ID based on the relative
		position of the source tile and destination tile. Positions will wrap
		around the columns and rows as needed. Accounts for tile order.
		Be careful when using this with Dynamic Wrap enabled! The positions
		are based on the un-wrapped positions, using the tileset's column count.

	It is possible to copy+paste animations across tilesets, but this has
	not been extensively tested.

	You can copy/cut from and paste to multiple tiles at once. If you copy/cut
	from one tile and paste to multiple tiles, the animation will be pasted to
	all the selected tiles. If you copy/cut from multiple tiles, the animations
	will be pasted one by one to the selected destination tiles, until either
	the destination tiles or the source tiles run out. This means if you select
	fewer tiles to paste to than you copied from, you'll lose some animations!

	You can copy animations from tiles with no animations. Pasting this will
	clear any existing animation on the destination tile.
	
	When using one of the adjust modes or pasting to a different tileset,
	it is possible that some frames will end up with tile IDs that don't exist
	in the tileset. This script leaves those in so that you can remedy them
	as you wish. You may want to replace the problem frames, or delete them
	while lengthening surrounding frames to compensate.
*/

let copyPasteAnimations = {
	copiedAnimations: [], //array of the Animations that have been copied
	copiedFrom: [], //array of the Tiles copied from.
	
	pasteModes: ["Exact", "Adjust ID", "Adjust Position"], //allowed paste modes
	//If changing the allowed pasteModes above, make sure you also adjust the pasteAnimation function below!
	currentPasteMode: 2, //Adjust Position
	
	pasteAnimation: function(dstTile, srcTile, newFrames) {
		//if(dstTile.tileset != srcTile.tileset) return; //eh, why not allow cross-tileset pasting :>
		switch(copyPasteAnimations.currentPasteMode) {
		case 0: //Exact
			dstTile.frames = newFrames;
			break;
		case 1: { //Adjust ID
			let difference = dstTile.id - srcTile.id;
			let adjustedFrames = [];
			for(let f = 0; f < newFrames.length; ++f) {
				let newFrame = Object.assign({}, newFrames[f]); //shallow copy of the frame since we're modifying it
				newFrame.tileId += difference;
				adjustedFrames.push(newFrame);
			}
			dstTile.frames = adjustedFrames;
			break;
		}
		case 2: { //Adjust Position
			let srcTileset = srcTile.tileset;
			let dstTileset = dstTile.tileset;
			let srcColumns = srcTileset.columnCount;
			let dstColumns = dstTileset.columnCount;
			// We can't rely on tile ID as an indicator of tile position in the tileset,
			// as tile order may be changed, and Collections may have missing tile IDs.
			// Instead, do everything based on tile index and columnCount.
			let srcTiles = srcTileset.tiles;
			let dstTiles = dstTileset.tiles;
			let srcIndex = srcTiles.indexOf(srcTile);
			let dstIndex = dstTiles.indexOf(dstTile);
			if(srcIndex < 0 || dstIndex < 0) {
				tiled.alert("The source and/or destination tiles don't exist in their tilesets!");
				return;
			}
			let srcX = srcIndex % srcColumns, srcY = Math.floor(srcIndex / srcColumns);
			let dstX = dstIndex % dstColumns, dstY = Math.floor(dstIndex / dstColumns);
			let diffX = dstX - srcX, diffY = dstY - srcY;
			
			let adjustedFrames = [];
			for(let f = 0; f < newFrames.length; ++f) {
				let newFrame = Object.assign({}, newFrames[f]); //shallow copy of the frame since we're modifying it
				let newTileId = newFrame.tileId;
				let newIndex = srcTiles.indexOf(srcTileset.tile(newTileId));
				let newX = newIndex % srcColumns, newY = Math.floor(newIndex / srcColumns);
				newX += diffX;
				newY += diffY;
				newX %= dstColumns;
				newY %= Math.floor(dstTiles.length / dstColumns);
				newIndex = newX + newY * dstColumns;
				let newTile = dstTiles[newIndex];
				if(newTile) {
					newFrame.tileId = newTile.id;
					adjustedFrames.push(newFrame);
				}
			}
			dstTile.frames = adjustedFrames;
			break;
		}
		}
	}
};

copyPasteAnimations.copyAnimations = tiled.registerAction("CopyTileAnimations", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileset)
		return;
	let tileset = tiled.activeAsset;
	if(!tileset.selectedTiles || tileset.selectedTiles.length == 0)
		return;
	
	copyPasteAnimations.copiedFrom = Array.from(tileset.selectedTiles);
	//Copy the animations:
	copyPasteAnimations.copiedAnimations.length = copyPasteAnimations.copiedFrom.length;
	for(let i = 0; i < copyPasteAnimations.copiedFrom.length; ++i) {
		let tile = copyPasteAnimations.copiedFrom[i];
		copyPasteAnimations.copiedAnimations[i] = Array.from(tile.frames);
	}
});
copyPasteAnimations.copyAnimations.text = "Copy Animations";

copyPasteAnimations.cutAnimations = tiled.registerAction("CutTileAnimations", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileset)
		return;
	let tileset = tiled.activeAsset;
	if(!tileset.selectedTiles || tileset.selectedTiles.length == 0)
		return;
	
	copyPasteAnimations.copiedFrom = Array.from(tileset.selectedTiles);
	//Copy and delete the animations:
	tileset.macro("Cut Tile Animations", function() {
		copyPasteAnimations.copiedAnimations.length = copyPasteAnimations.copiedFrom.length;
		for(let i = 0; i < copyPasteAnimations.copiedFrom.length; ++i) {
			let tile = copyPasteAnimations.copiedFrom[i];
			copyPasteAnimations.copiedAnimations[i] = Array.from(tile.frames);
			tile.frames = [];
		}
	});
});
copyPasteAnimations.cutAnimations.text = "Cut Animations";

copyPasteAnimations.pasteAnimations = tiled.registerAction("PasteTileAnimations", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileset)
		return;
	let tileset = tiled.activeAsset;
	if(!tileset.selectedTiles || tileset.selectedTiles.length == 0)
		return;
	
	let selectedTiles = tileset.selectedTiles;
	//Paste the animations:
	tileset.macro("Paste Tile Animations", function() {
		for(let dst = 0; dst < selectedTiles.length; ++dst) {
			let dstTile = selectedTiles[dst];
			if(copyPasteAnimations.copiedFrom.length == 1) {
				copyPasteAnimations.pasteAnimation(dstTile, copyPasteAnimations.copiedFrom[0], copyPasteAnimations.copiedAnimations[0]);
				continue;
			}
			if(dst >= copyPasteAnimations.copiedFrom.length)
				break;
			copyPasteAnimations.pasteAnimation(dstTile, copyPasteAnimations.copiedFrom[dst], copyPasteAnimations.copiedAnimations[dst]);
		}
	});
});
copyPasteAnimations.pasteAnimations.text = "Paste Animations";

copyPasteAnimations.changeMode = tiled.registerAction("ChangeAnimationPasteMode", function(action) {
	copyPasteAnimations.currentPasteMode = (copyPasteAnimations.currentPasteMode + 1) % copyPasteAnimations.pasteModes.length;
	copyPasteAnimations.changeMode.text = "Paste mode: "+copyPasteAnimations.pasteModes[copyPasteAnimations.currentPasteMode];
});
copyPasteAnimations.changeMode.text = "Paste mode: "+copyPasteAnimations.pasteModes[copyPasteAnimations.currentPasteMode];

//Enable the actions only when
copyPasteAnimations.onAssetChanged = function() {
	let asset = tiled.activeAsset;
	if(asset && asset.isTileset) {
		copyPasteAnimations.copyAnimations.enabled = true;
		copyPasteAnimations.cutAnimations.enabled = true;
		copyPasteAnimations.pasteAnimations.enabled = true;
		copyPasteAnimations.changeMode.enabled = true;
		copyPasteAnimations.copyAnimations.visible = true;
		copyPasteAnimations.cutAnimations.visible = true;
		copyPasteAnimations.pasteAnimations.visible = true;
		copyPasteAnimations.changeMode.visible = true;
	} else {
		copyPasteAnimations.copyAnimations.enabled = false;
		copyPasteAnimations.cutAnimations.enabled = false;
		copyPasteAnimations.pasteAnimations.enabled = false;
		copyPasteAnimations.changeMode.enabled = false;
		copyPasteAnimations.copyAnimations.visible = false;
		copyPasteAnimations.cutAnimations.visible = false;
		copyPasteAnimations.pasteAnimations.visible = false;
		copyPasteAnimations.changeMode.visible = false;
	}
}
copyPasteAnimations.onAssetChanged(); //Make sure the actions have the correct state
tiled.activeAssetChanged.connect(copyPasteAnimations.onAssetChanged);

//Tileset top menu:
tiled.extendMenu("Tileset", [
	{ action: "CopyTileAnimations", before: "TilesetProperties" },
	{ action: "CutTileAnimations"},
	{ action: "PasteTileAnimations"},
	{ action: "ChangeAnimationPasteMode"},
	{separator: true}
]);
//Tileset right-click menu:
//This also adds them to the Tilesets panel's menu where they don't work, which is why we hide the actions for non-tileset documents
tiled.extendMenu("TilesetView.Tiles", [
	{separator: true},
	{ action: "CopyTileAnimations"},
	{ action: "CutTileAnimations"},
	{ action: "PasteTileAnimations"},
	{ action: "ChangeAnimationPasteMode"}
]);
