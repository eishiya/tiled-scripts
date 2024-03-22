/* 	Select Layer Tiles by eishiya, last updated 22 Mar 2024

	Adds an action to the Layer context menu to select
	all of the selected Tile Layers' non-empty tiles.
	
	This opens up various workflows, such as quickly filling the shape
	of a layer with shift+bucket fill, "saving" selections as layers,
	and being able to quickly use a layer as a faux mask.
*/
const selectLayerTiles = tiled.registerAction("SelectLayerTiles", function(action) {	
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	//let layer = map.currentLayer;
	let layersSelected = 0;
	for(let layer of map.selectedLayers) {
		if(!layer.isTileLayer)
			continue;
		if(layersSelected = 0)
			map.selectedArea.set(layer.region());
		else
			map.selectedArea.add(layer.region());
	}
	
	
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
		
		let tileLayersFound = false;
		for(let layer of asset.selectedLayers) {
			if(layer.isTileLayer) {
				tileLayersFound = true;
				break;
			}
		}
		if(tileLayersFound)
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
