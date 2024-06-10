/*
 * Generated by Eclipse Dirigible based on model and template.
 *
 * Do not modify the content as it may be re-generated again.
 */
import { response } from "sdk/http";
import { extensions } from "sdk/extensions";
import { user } from "sdk/security";

let tiles = {};

let tileExtensions = await extensions.loadExtensionModules("pet-store-tile");
for (let i = 0; i < tileExtensions?.length; i++) {
    let tile = tileExtensions[i].getTile();


    let hasRoles = true;
    if (tile.roles && Array.isArray(tile.roles)) {
        for (const next of tile.roles) {
            if (!user.isInRole(next)) {
                hasRoles = false;
                break;
            }
        }
    }
    if (!tile || (tile.role && !user.isInRole(tile.role)) || !hasRoles) {
        continue;
    }
    if (!tiles[tile.group]) {
        tiles[tile.group] = [];
    }
    tiles[tile.group].push({
        name: tile.name,
        location: tile.location,
        caption: tile.caption,
        tooltip: tile.tooltip,
        order: parseInt(tile.order),
        groupOrder: parseInt(tile.groupOrder)
    });
}

for (let next in tiles) {
    tiles[next] = tiles[next].sort((a, b) => a.order - b.order);
}

let sortedGroups = [];
for (let next in tiles) {
    sortedGroups.push({
        name: next,
        order: tiles[next][0] && tiles[next][0].groupOrder ? tiles[next][0].groupOrder : 100,
        tiles: tiles[next]
    });
}
sortedGroups = sortedGroups.sort((a, b) => a.order - b.order);

let sortedTiles = {};
for (let i = 0; i < sortedGroups.length; i++) {
    sortedTiles[sortedGroups[i].name] = sortedGroups[i].tiles;
}
response.setContentType("application/json");
response.println(JSON.stringify(sortedTiles));