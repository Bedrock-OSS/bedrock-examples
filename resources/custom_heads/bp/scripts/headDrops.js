import { world, system, ItemStack } from '@minecraft/server';

// Object where keys are entity types and values are the item to drop when exploded by a charged creeper
const heads = {
    "minecraft:husk": "wiki:custom_head",
};
// Set containing the unique IDs of charged creepers that have exploded within the last tick
const explodingChargedCreepers = new Set();
world.beforeEvents.explosion.subscribe(({ source }) => {
    if (!source)
        return;
    const isCreeper = source.typeId === "minecraft:creeper";
    const isCharged = source.hasComponent("minecraft:is_charged");
    if (isCreeper && isCharged) {
        // Add the charged creeper's ID to the set
        explodingChargedCreepers.add(source.id);
        // Remove the ID after the next tick
        system.runTimeout(() => explodingChargedCreepers.delete(source.id), 1);
    }
});
world.afterEvents.entityDie.subscribe((event) => {
    const { damagingEntity } = event.damageSource;
    if (!damagingEntity || !world.gameRules.doMobLoot)
        return;
    // Check whether the damaging entity is one of the charged creepers that exploded within the last tick
    const explodedByChargedCreeper = explodingChargedCreepers.has(damagingEntity.id);
    if (explodedByChargedCreeper) {
        const { dimension, location, typeId } = event.deadEntity;
        const head = heads[typeId];
        dimension.spawnItem(new ItemStack(head), location);
    }
}, { entityTypes: Object.keys(heads) });
