/**
 * EAS postinstall script.
 *
 * react-native-reanimated@4.5.1 requires react-native-worklets@0.10.x.
 * (The old 0.5.1 "resolutions" override — left over from reanimated@4.1.1 —
 * forced a mismatched worklets version, which crashed iOS OTA bundles on boot
 * and made expo-updates silently roll back to the embedded bundle. It has been
 * removed so JS and native worklets versions always match.)
 */

console.log('[postinstall] react-native-worklets pinned to 0.10.x for reanimated@4.5.1');
