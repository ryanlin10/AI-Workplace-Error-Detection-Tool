/**
 * Utility script to add a reference image for facial recognition
 * 
 * Usage: node add_reference_image.js <person_id> <image_path>
 * Example: node add_reference_image.js 1 /path/to/person1.jpg
 */

const fs = require('fs');
const path = require('path');

// Reference faces directory
const referenceFacesDir = path.join(__dirname, 'reference_faces');

// Create directory if it doesn't exist
if (!fs.existsSync(referenceFacesDir)) {
  fs.mkdirSync(referenceFacesDir, { recursive: true });
  console.log(`Created reference faces directory at ${referenceFacesDir}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node add_reference_image.js <person_id> <image_path>');
  console.error('Example: node add_reference_image.js 1 /path/to/person1.jpg');
  process.exit(1);
}

const personId = parseInt(args[0], 10);
const sourcePath = args[1];

// Validate person ID
if (isNaN(personId) || personId < 1 || personId > 4) {
  console.error('Person ID must be a number between 1 and 4');
  process.exit(1);
}

// Validate source path
if (!fs.existsSync(sourcePath)) {
  console.error(`Source file does not exist: ${sourcePath}`);
  process.exit(1);
}

// Determine file extension
const fileExtension = path.extname(sourcePath).toLowerCase();
if (!['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
  console.error('Only JPG and PNG image formats are supported');
  process.exit(1);
}

// Copy the file
const targetFilename = `person${personId}${fileExtension}`;
const targetPath = path.join(referenceFacesDir, targetFilename);

try {
  // Read source file
  const imageData = fs.readFileSync(sourcePath);
  
  // Write to target file
  fs.writeFileSync(targetPath, imageData);
  
  // Update the database entry if needed
  console.log(`Reference image for Person ${personId} added successfully!`);
  console.log(`File saved to: ${targetPath}`);
  
  // Remind user to update server.js if file extension changed
  console.log(`Note: Make sure the reference image filename in server.js matches: person${personId}${fileExtension}`);
} catch (error) {
  console.error('Error copying reference image:', error.message);
  process.exit(1);
} 