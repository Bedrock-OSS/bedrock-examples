import { BlockStates, system } from "@minecraft/server";

// Make sure you change "wiki" to your own namespace!
const componentName = "wiki:n_way_rotation";

/** @type {import("@minecraft/server").BlockCustomComponent} */
const BlockNWayRotationComponent = {
    beforeOnPlayerPlace(event, { params }) {
        const { player } = event;
        if (!player) return;

        // Get the number of rotation state values
        const rotationState = params.rotation_state;
        const n = BlockStates.get(rotationState).validValues.length;

        // Get the "y_rotation_offset" value defined in the block JSON (default to 0) and add it to the player's Y rotation
        const yRotationOffset = params.y_rotation_offset ?? 0;
        const yRotation = player.getRotation().y + yRotationOffset;

        // Get the rotation state value from the player's Y rotation
        const value = getNWayRotation(n, yRotation);

        // Update the block permutation being placed
        event.permutationToPlace = event.permutationToPlace.withState(rotationState, value);
    },
};

// Register the custom component with the name "wiki:n_way_rotation"
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent(componentName, BlockNWayRotationComponent);
});

/**
 * @param {number} n
 * @param {number} rotation
 */
function getNWayRotation(n, rotation) {
    // Angle between different state values
    const rotationInterval = 360 / n;

    // Converts the rotation into a positive angle below 360
    rotation %= 360;
    if (rotation < 0) rotation += 360;

    // Returns the rotation as a value that is less than n
    return Math.round(rotation / rotationInterval) % n;
}
