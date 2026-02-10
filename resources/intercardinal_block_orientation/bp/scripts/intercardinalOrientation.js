import { system } from '@minecraft/server';

/** @param {number} yRotation */
function getIntercardinalDirection(yRotation) {
    // Converts the Y rotation into a positive angle below 360
    yRotation %= 360;
    if (yRotation < 0)
        yRotation += 360;
    // Returns the Y rotation as an intercardinal direction below 16
    return Math.round(yRotation / 22.5) % 16;
}
// Make sure you change "wiki" to your own namespace!
const stateName = "wiki:intercardinal_direction";
const componentName = "wiki:intercardinal_orientation";
/** @type {import("@minecraft/server").BlockCustomComponent} */
const BlockIntercardinalOrientationComponent = {
    beforeOnPlayerPlace(event, { params }) {
        const { player } = event;
        if (!player)
            return;
        // Get the "y_rotation_offset" value defined in the block JSON (default to 0) and add it to the player's Y rotation
        const yRotationOffset = params.y_rotation_offset ?? 0;
        const yRotation = player.getRotation().y + yRotationOffset;
        // Get the intercardinal direction value (0-15) from the player's Y rotation
        const direction = getIntercardinalDirection(yRotation);
        // Update the block permutation being placed
        event.permutationToPlace = event.permutationToPlace.withState(stateName, direction);
    },
};
// Register the custom component with the name "wiki:intercardinal_orientation".
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent(componentName, BlockIntercardinalOrientationComponent);
});
