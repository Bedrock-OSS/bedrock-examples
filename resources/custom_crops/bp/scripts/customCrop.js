import { EquipmentSlot, GameMode, system } from "@minecraft/server";

/**
 * @param {number} min The minimum integer
 * @param {number} max The maximum integer
 * @returns {number} A random integer between the `min` and `max` parameters (inclusive)
 */
const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/** @type {import("@minecraft/server").BlockCustomComponent} */
const BlockGrowableComponent = {
    onRandomTick({ block }, { params }) {
        const minLightLevel = params.min_light_level;

        const lightLevel = block.getLightLevel();
        if (lightLevel < minLightLevel) return;

        const growthState = params.growth_state;
        const growthChance = params.growth_chance / 100;

        if (Math.random() > growthChance) return;

        const growth = block.permutation.getState(growthState);
        block.setPermutation(
            block.permutation.withState(growthState, growth + 1)
        );
    },
    onPlayerInteract({ block, dimension, player }, { params }) {
        const growthState = params.growth_state;
        const maxGrowth = params.max_growth;

        if (!player) return;

        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        const hasBoneMeal =
            mainhand.hasItem() && mainhand.typeId === "minecraft:bone_meal";

        if (!hasBoneMeal) return;

        if (player.getGameMode() === GameMode.Creative) {
            // Grow crop fully
            block.setPermutation(
                block.permutation.withState(growthState, maxGrowth)
            );
        } else {
            let growth = block.permutation.getState(growthState);

            // Add random amount of growth
            growth += randomInt(1, maxGrowth - growth);
            block.setPermutation(
                block.permutation.withState(growthState, growth)
            );

            // Decrement stack
            if (mainhand.amount > 1) mainhand.amount--;
            else mainhand.setItem(undefined);
        }

        // Play effects
        const effectLocation = block.center();
        dimension.playSound("item.bone_meal.use", effectLocation);
        dimension.spawnParticle(
            "minecraft:crop_growth_emitter",
            effectLocation
        );
    },
};

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent(
        "wiki:growable",
        BlockGrowableComponent
    );
});
