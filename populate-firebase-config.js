const fs = require('fs');

const templatePath = './firebase-init.js.template';
const outputPath = './firebase-init.js';

console.log('Starting Firebase config population...');

try {
    // Read the template file
    let templateContent = fs.readFileSync(templatePath, 'utf8');
    console.log('Read template file successfully.');

    // List of environment variables and their placeholders
    const replacements = {
        '__FIREBASE_API_KEY__': process.env.FIREBASE_API_KEY,
        '__FIREBASE_AUTH_DOMAIN__': process.env.FIREBASE_AUTH_DOMAIN,
        '__FIREBASE_PROJECT_ID__': process.env.FIREBASE_PROJECT_ID,
        '__FIREBASE_STORAGE_BUCKET__': process.env.FIREBASE_STORAGE_BUCKET,
        '__FIREBASE_MESSAGING_SENDER_ID__': process.env.FIREBASE_MESSAGING_SENDER_ID,
        '__FIREBASE_APP_ID__': process.env.FIREBASE_APP_ID,
        '__FIREBASE_MEASUREMENT_ID__': process.env.FIREBASE_MEASUREMENT_ID || '' // Handle optional measurement ID
    };

    let missingVars = [];

    // Replace placeholders with environment variable values
    for (const placeholder in replacements) {
        const envVarValue = replacements[placeholder];
        if (envVarValue) {
            // Need to escape special characters for regex if any were present
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            templateContent = templateContent.replace(regex, envVarValue);
            console.log(`Replaced ${placeholder}`);
        } else if (placeholder !== '__FIREBASE_MEASUREMENT_ID__') { // Measurement ID is optional
            console.warn(`Warning: Environment variable for ${placeholder} is not set.`);
            missingVars.push(placeholder.replace(/__/g,'')); // Add corresponding env var name
        }
    }

    if (missingVars.length > 0) {
        console.error('Error: The following required environment variables are missing in Netlify build settings:', missingVars.join(', '));
        process.exit(1); // Exit with error code
    }

    // Write the final firebase-init.js file
    fs.writeFileSync(outputPath, templateContent, 'utf8');
    console.log(`Successfully created ${outputPath}`);

} catch (error) {
    console.error('Error processing Firebase config:', error);
    process.exit(1); // Exit with error code
} 