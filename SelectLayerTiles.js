/* 	Select Layer Tiles by eishiya, last updated 22 Mar 2024

	Adds an action to the Layer context menu to select
	all of its non-empty tiles. Only works for Tile Layers.
	
	This opens up various workflows, such as quickly filling the shape
	of a layer with shift+bucket fill, "saving" selections as layers,
	and being able to quickly use a layer as a faux mask.
	
	It's essentially the same as Select Same Tile on Empty + Inverse Selection,
	but as a right-click menu option (or via shortcut, if you wish).
*/
const selectLayerTiles = tiled.registerAction("SelectLayerTiles", function(action) {	
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	let layer = map.currentLayer;
	if(!layer || !layer.isTileLayer)
		return;
	
	map.selectedArea.set(layer.region());
});
selectLayerTiles.text = "Select Layer Tiles";

//Only enable the action while the currentLayer is a TileLayer:
selectLayerTiles.previousAsset = null;
selectLayerTiles.updateActive = function() {
	if(selectLayerTiles.previousAsset) {
		selectLayerTiles.previousAsset.selectedLayersChanged.disconnect(selectLayerTiles.updateActive);
	}
	let asset = tiled.activeAsset;
	if(asset.isTileMap) {
		selectLayerTiles.previousAsset = asset;
		asset.selectedLayersChanged.connect(selectLayerTiles.updateActive);
		if(asset.currentLayer && asset.currentLayer.isTileLayer)
			selectLayerTiles.enabled = true;
		else
			selectLayerTiles.enabled = false;
	} else {
		selectLayerTiles.enabled = false;
	}
}
selectLayerTiles.updateActive();
tiled.activeAssetChanged.connect(selectLayerTiles.updateActive);

//Add this action to the Layers panel context menu:
tiled.extendMenu("LayerView.Layers", [
	{ action: "SelectLayerTiles", before: "LayerProperties" },
	{ separator: true }
]);
