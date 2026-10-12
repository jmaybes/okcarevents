const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAndroidFonts(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const fontsDir = path.join(projectRoot, 'assets', 'fonts');
      const androidFontsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
        'fonts'
      );

      // Create fonts directory if it doesn't exist
      if (!fs.existsSync(androidFontsDir)) {
        fs.mkdirSync(androidFontsDir, { recursive: true });
      }

      // Copy font files
      const fontFiles = ['RockSalt-Regular.ttf', 'RobotoCondensed-Regular.ttf', 'SpaceMono-Regular.ttf'];
      
      for (const fontFile of fontFiles) {
        const sourcePath = path.join(fontsDir, fontFile);
        const destPath = path.join(androidFontsDir, fontFile);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copied ${fontFile} to Android assets`);
        }
      }

      return config;
    },
  ]);
};
