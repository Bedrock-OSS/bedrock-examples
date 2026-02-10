import { system, EquipmentSlot, GameMode } from '@minecraft/server';

const cropGrowthComponentName = "wiki:crop_growth";
/** @type {import("@minecraft/server").BlockCustomComponent} */
const BlockCropGrowthComponent = {
    onRandomTick({ block }, { params }) {
        // Growth parameters
        const growthState = params.growth_state;
        const maxGrowth = params.max_growth;
        const minLightLevel = params.min_light_level;
        // Ensure that the minimum light level is met
        if (block.getLightLevel() < minLightLevel)
            return;
        const { permutation } = block;
        // Get the current growth of the crop
        const growth = permutation.getState(growthState) ?? maxGrowth;
        // Ensure that the crop is not already fully grown
        if (growth === maxGrowth)
            return;
        // Only grow on some random ticks
        if (!randomShouldCropGrow(block, params))
            return;
        // Increment the growth state
        block.setPermutation(permutation.withState(growthState, growth + 1));
    },
    onPlayerInteract({ block, dimension, player }, { params }) {
        if (!player)
            return;
        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable)
            return;
        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!mainhand.hasItem())
            return;
        const hasBoneMeal = mainhand.typeId === "minecraft:bone_meal"; // Whether the player is holding Bone Meal
        const hasRapidFertilizer = mainhand.typeId === "minecraft:rapid_fertilizer"; // Whether the player is holding Super Fertilizer (from Minecraft Eduction)
        // Exit if the player is not holding Bone Meal or Super Fertilizer
        if (!hasBoneMeal && !hasRapidFertilizer)
            return;
        const isCreative = player.getGameMode() === GameMode.Creative; // Whether the player is in creative mode
        // Growth parameters
        const growthState = params.growth_state;
        const growthRange = params.growth_on_fertilize;
        const maxGrowth = params.max_growth;
        const { permutation } = block;
        if (hasRapidFertilizer || isCreative) {
            // Grow the crop fully when the player is holding Super Fertilizer or is in creative mode
            block.setPermutation(permutation.withState(growthState, maxGrowth));
        }
        else {
            // Add a random amount of growth when the player is using Bone Meal and is not in creative mode
            let growth = permutation.getState(growthState);
            growth += randomInt(...growthRange); // Add a random amount of growth in the "growth_on_fertilize" range
            growth = Math.min(growth, maxGrowth); // Prevent the new growth from being over the maximum
            block.setPermutation(permutation.withState(growthState, growth));
        }
        // Decrement the item stack when the player is not in creative mode
        if (!isCreative) {
            if (mainhand.amount > 1)
                mainhand.amount--;
            else
                mainhand.setItem(undefined);
        }
        // Play effects
        const effectLocation = block.center();
        dimension.playSound("item.bone_meal.use", effectLocation);
        dimension.spawnParticle("minecraft:crop_growth_emitter", effectLocation);
    },
};
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent(cropGrowthComponentName, BlockCropGrowthComponent);
});
/**
 * @param {number} min The minimum integer
 * @param {number} max The maximum integer
 * @returns {number} A random integer between the `min` and `max` parameters (inclusive)
 */
function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
function randomShouldCropGrow(crop, growthParams) {
    const growthSpeed = getGrowthSpeed(crop, growthParams);
    const growthChanceRange = Math.floor(25 / growthSpeed);
    return randomInt(0, growthChanceRange) === 0;
}
/**
 * @param {import("@minecraft/server").Block} crop The block to get the growth speed of
 * @returns {number} A number representing the growth speed of the crop
 */
function getGrowthSpeed(crop, growthParams) {
    let speed = 1;
    // Increase growth speed based on nearby farmland blocks and their moisture
    for (const farmland of getFarmlandIterator(crop, growthParams.farmland_search_range)) {
        let speedModifier = growthParams.farmland_speed_modifier;
        const moisture = farmland.permutation.getState("moisturized_amount");
        if (moisture > 0) {
            speedModifier += growthParams.farmland_moisture_speed_modifier;
        }
        const isDirectlyBelowCrop = farmland.x === crop.x && farmland.z === crop.z;
        if (!isDirectlyBelowCrop) {
            speedModifier *= growthParams.neighboring_farmland_speed_multiplier;
        }
        speed += speedModifier;
    }
    // Halves the growth speed if there are surrounding crops of the same type in vanilla (where "crowding_speed_multiplier" is 0.5)
    if (isCrowded(crop)) {
        speed *= growthParams.crowding_speed_multiplier;
    }
    return speed;
}
/**
 * @param {import("@minecraft/server").Block} crop
 * @param {number} searchRange Maximum offset in each direction of the X and Z axes where farmland can be found
 * @returns {Generator} A generator that iterates through each farmland block in an area underneath the crop
 */
function* getFarmlandIterator(crop, searchRange) {
    for (let x = -searchRange; x <= searchRange; x++) {
        for (let z = -searchRange; z <= searchRange; z++) {
            const block = crop.offset({ x, y: -1, z });
            // Yield the block if it is farmland
            const isFarmland = block?.typeId === "minecraft:farmland";
            if (isFarmland)
                yield block;
        }
    }
}
/**
 * @param {Block} crop
 * @returns {boolean} Whether there are surrounding crops of the same type
 */
function isCrowded(crop) {
    const northBlock = crop.north();
    const southBlock = crop.south();
    const westBlock = crop.west();
    const eastBlock = crop.east();
    const isEnclosed = (westBlock?.typeId === crop.typeId || eastBlock?.typeId === crop.typeId) &&
        (northBlock?.typeId === crop.typeId || southBlock?.typeId === crop.typeId);
    if (isEnclosed)
        return true;
    const isCropDiagonallyAdjacent = northBlock?.west()?.typeId === crop.typeId ||
        northBlock?.east()?.typeId === crop.typeId ||
        southBlock?.west()?.typeId === crop.typeId ||
        southBlock?.east()?.typeId === crop.typeId;
    if (isCropDiagonallyAdjacent)
        return true;
    return false;
}

export { cropGrowthComponentName, randomShouldCropGrow };
