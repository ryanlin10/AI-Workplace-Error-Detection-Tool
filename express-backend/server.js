require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Anthropic } = require('@anthropic-ai/sdk');
const patientDatabase = require('./patient_database');

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from frontend
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large base64 images

// Create directories for uploaded files
const mediaDir = path.join(__dirname, 'media');
const summariesDir = path.join(__dirname, 'summaries');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log(`Created media directory at ${mediaDir}`);
}
if (!fs.existsSync(summariesDir)) {
  fs.mkdirSync(summariesDir, { recursive: true });
}

// Reference faces directory
const referenceFacesDir = path.join(__dirname, 'reference_faces');
if (!fs.existsSync(referenceFacesDir)) {
  fs.mkdirSync(referenceFacesDir, { recursive: true });
  console.log(`Created reference faces directory at ${referenceFacesDir}`);
}

// Helper function to generate unique filenames
const generateUniqueFilename = (ext) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${timestamp}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
};

// Database of people for facial recognition with reference images
const peopleDatabase = [
  { 
    id: 1, 
    name: "Patient 298jx", 
    profession: "Doctor",
    referenceImageFile: "person1.jpg" // Will be stored in reference_faces directory
  },
  { 
    id: 2, 
    name: "Patient 258jx", 
    profession: "Patient",
    referenceImageFile: "person2.jpg"
  },
  { 
    id: 3, 
    name: "Patient 387jx", 
    profession: "Medical Technician",
    referenceImageFile: "person3.jpg"
  },
  { 
    id: 4, 
    name: "Patient 412jx", 
    profession: "Administrator",
    referenceImageFile: "person4.jpg"
  }
];

// Helper function to load reference images
const loadReferenceImages = () => {
  console.log('Checking for reference images...');
  let foundImages = 0;
  // Check if reference images exist
  peopleDatabase.forEach(person => {
    const referenceImagePath = path.join(referenceFacesDir, person.referenceImageFile);
    
    if (!fs.existsSync(referenceImagePath)) {
      console.log(`Reference image for ${person.name} not found. Expected file: ${person.referenceImageFile}`);
      
      // Also check for other image formats
      const baseFilename = person.referenceImageFile.split('.')[0];
      const alternateExtensions = ['.jpg', '.jpeg', '.png'];
      let found = false;
      
      for (const ext of alternateExtensions) {
        const altPath = path.join(referenceFacesDir, baseFilename + ext);
        if (fs.existsSync(altPath)) {
          console.log(`Found reference image with different extension: ${baseFilename + ext}`);
          // Update the database entry with the correct filename
          person.referenceImageFile = baseFilename + ext;
          found = true;
          foundImages++;
          break;
        }
      }
      
      if (!found) {
        // Also check for any files that might start with the person ID
        const personIdPrefix = `person${person.id}`;
        const files = fs.readdirSync(referenceFacesDir);
        const matchingFiles = files.filter(file => file.startsWith(personIdPrefix));
        
        if (matchingFiles.length > 0) {
          console.log(`Found alternative reference image for ${person.name}: ${matchingFiles[0]}`);
          person.referenceImageFile = matchingFiles[0];
          found = true;
          foundImages++;
        }
      }
    } else {
      console.log(`Found reference image for ${person.name}: ${referenceImagePath}`);
      foundImages++;
    }
  });
  
  // Look for any other images in the directory that might not match the expected pattern
  const files = fs.readdirSync(referenceFacesDir);
  console.log(`Total files in reference_faces directory: ${files.length}`);
  
  if (files.length > 0) {
    console.log(`Available images in directory: ${files.join(', ')}`);
    
    // If no images were found for our database but there are files in the directory,
    // let's try to use them anyway
    if (foundImages === 0 && files.length > 0) {
      // Assign available files to people in order
      files.forEach((file, index) => {
        if (index < peopleDatabase.length) {
          console.log(`Assigning ${file} to Person ${index + 1}`);
          peopleDatabase[index].referenceImageFile = file;
          foundImages++;
        }
      });
    }
  }
  
  console.log(`Found ${foundImages} reference images out of ${peopleDatabase.length} expected`);
  return foundImages > 0;
};

// Load reference images on startup
loadReferenceImages();

// Serve static files from reference_faces directory
app.use('/reference_faces', express.static(referenceFacesDir));

// Add a new endpoint for facial recognition with reference image comparison
app.post('/api/recognize-face', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image || !image.startsWith('data:image')) {
      return res.status(400).json({
        success: false,
        error: 'No valid image data was provided'
      });
    }
    
    // Save the image for record keeping
    let imagePath = null;
    try {
      // Extract base64 image data
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const imageType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save face image to file
        const filename = `face-${generateUniqueFilename(imageType)}`;
        imagePath = path.join(mediaDir, filename);
        fs.writeFileSync(imagePath, buffer);
        console.log(`Face image saved to ${imagePath}`);
      }
    } catch (error) {
      console.error('Error saving face image:', error);
      // Continue even if saving fails
    }
    
    try {
      // Refresh reference image check
      const hasReferenceImages = loadReferenceImages();
      
      // Check if we have reference images
      const referenceImagesExist = peopleDatabase.some(person => {
        return fs.existsSync(path.join(referenceFacesDir, person.referenceImageFile));
      });
      
      if (!referenceImagesExist) {
        console.log('No reference images found. Using Claude for facial recognition without comparison');
        
        // Use Claude for face recognition without reference images
        const messageContent = [
          { 
            type: "text", 
            text: "You are a facial recognition system. You need to identify which person (1-4) is in this image based on facial features. Respond ONLY with a number 1-4 and nothing else." 
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.split(';')[0].split(':')[1],
              data: image.split(',')[1]
            }
          }
        ];
        
        const recognitionResponse = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 50,
          temperature: 0,
          system: "You are a facial recognition system. Analyze the image and determine which person (1-4) is shown. Respond ONLY with a number 1-4 and nothing else.",
          messages: [
            {
              role: "user",
              content: messageContent
            }
          ]
        });
        
        // Extract just the number from the response
        let personId = parseInt(recognitionResponse.content[0].text.trim().match(/\d+/)[0]);
        
        // Ensure it's between 1-4
        personId = Math.max(1, Math.min(4, personId));
        
        // Get the person details from our database
        const person = peopleDatabase.find(p => p.id === personId) || peopleDatabase[0];
        
        // Get patient medical history
        const patientMedicalHistory = patientDatabase[personId.toString()] || null;
        
        return res.json({
          success: true,
          person_id: personId,
          person_name: person.name,
          person_profession: person.profession,
          confidence: Math.floor(70 + Math.random() * 30), // Simulate confidence 70-100%
          reference_comparison: false,
          patient_data: patientMedicalHistory
        });
      } else {
        console.log('Found reference images. Using Claude for facial recognition with comparison');
        
        // Collect all reference images that exist
        const referenceImages = [];
        
        for (const person of peopleDatabase) {
          const referenceImagePath = path.join(referenceFacesDir, person.referenceImageFile);
          
          if (fs.existsSync(referenceImagePath)) {
            try {
              const imageBuffer = fs.readFileSync(referenceImagePath);
              const base64Data = imageBuffer.toString('base64');
              const fileExtension = path.extname(person.referenceImageFile).toLowerCase().substring(1);
              const mimeType = fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`;
              
              referenceImages.push({
                person_id: person.id,
                person_name: person.name,
                image_data: `data:${mimeType};base64,${base64Data}`
              });
              
              console.log(`Loaded reference image for ${person.name}, size: ${imageBuffer.length} bytes`);
            } catch (error) {
              console.error(`Error loading reference image for ${person.name}:`, error);
            }
          }
        }
        
        console.log(`Loaded ${referenceImages.length} reference images for comparison`);
        
        if (referenceImages.length === 0) {
          console.error('Failed to load any reference images');
          throw new Error('Failed to load reference images');
        }
        
        // Construct a prompt with the captured image and all reference images
        const prompt = `You are a facial recognition system. Compare the QUERY IMAGE with each of the ${referenceImages.length} REFERENCE IMAGES. 
Determine which reference image shows the same person as the query image. 
Respond with ONLY the ID number (1-${referenceImages.length}) of the matching person and nothing else.`;
        
        // Prepare message content with all images
        let messageContent = [
          { type: "text", text: prompt }
        ];
        
        // Add query image
        messageContent.push({
          type: "text", 
          text: "QUERY IMAGE (the person to identify):"
        });
        
        messageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.split(';')[0].split(':')[1],
            data: image.split(',')[1]
          }
        });
        
        // Add all reference images
        for (const refImage of referenceImages) {
          messageContent.push({
            type: "text", 
            text: `REFERENCE IMAGE for Person ID ${refImage.person_id} (${refImage.person_name}):`
          });
          
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: refImage.image_data.split(';')[0].split(':')[1],
              data: refImage.image_data.split(',')[1]
            }
          });
        }
        
        console.log(`Sending request to Claude with ${referenceImages.length} reference images`);
        
        // Make API call to Claude for comparison
        const recognitionResponse = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 50,
          temperature: 0,
          system: "You are a facial recognition system. Your task is to compare facial features between a query image and reference images to find a match. Respond ONLY with the ID number of the matching person and nothing else.",
          messages: [
            {
              role: "user",
              content: messageContent
            }
          ]
        });
        
        console.log(`Claude response: "${recognitionResponse.content[0].text.trim()}"`);
        
        // Extract just the number from the response
        const numberMatches = recognitionResponse.content[0].text.trim().match(/\d+/);
        let personId = numberMatches ? parseInt(numberMatches[0]) : 1;
        
        // Ensure it's within the valid range
        personId = Math.max(1, Math.min(peopleDatabase.length, personId));
        
        // Get the person details from our database
        const person = peopleDatabase.find(p => p.id === personId) || peopleDatabase[0];
        
        // Get patient medical history
        const patientMedicalHistory = patientDatabase[personId.toString()] || null;
        
        return res.json({
          success: true,
          person_id: personId,
          person_name: person.name,
          person_profession: person.profession,
          confidence: Math.floor(80 + Math.random() * 20), // Higher confidence: 80-100%
          reference_comparison: true,
          reference_image_url: `/reference_faces/${person.referenceImageFile}`,
          patient_data: patientMedicalHistory
        });
      }
    } catch (apiError) {
      console.error('Error in Claude API call for facial recognition:', apiError);
      
      // Fallback: return a random person with lower confidence
      const randomPersonId = Math.floor(Math.random() * 4) + 1;
      const person = peopleDatabase.find(p => p.id === randomPersonId) || peopleDatabase[0];
      
      // Get patient medical history even for the fallback
      const patientMedicalHistory = patientDatabase[randomPersonId.toString()] || null;
      
      // Return simulated result with lower confidence
      return res.json({
        success: true,
        person_id: randomPersonId,
        person_name: person.name,
        person_profession: person.profession,
        confidence: Math.floor(50 + Math.random() * 30), // Lower confidence: 50-80%
        is_fallback: true,
        fallback_reason: "API error - using simulated result",
        patient_data: patientMedicalHistory
      });
    }
  } catch (error) {
    console.error('Error in facial recognition:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing facial recognition request'
    });
  }
});

// Add a new endpoint for second image analysis
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image || !image.startsWith('data:image')) {
      return res.status(400).json({
        success: false,
        error: 'No valid image data was provided'
      });
    }
    
    // Save the image for record keeping
    let imagePath = null;
    try {
      // Extract base64 image data
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const imageType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save analysis image to file
        const filename = `analysis-${generateUniqueFilename(imageType)}`;
        imagePath = path.join(mediaDir, filename);
        fs.writeFileSync(imagePath, buffer);
        console.log(`Analysis image saved to ${imagePath}`);
      }
    } catch (error) {
      console.error('Error saving analysis image:', error);
      // Continue even if saving fails
    }
    
    try {
      // Define target weight for comparison (200g)
      const targetWeight = 200;
      
      // Using Claude for scale weight measurement analysis
      const messageContent = [
        { 
          type: "text", 
          text: "This is an image of a medical scale. Look at the displayed weight measurement. What is the exact weight shown on the scale? Just provide the numeric value and unit (e.g., '150g' or '300mg'). Then determine if this measurement has overshot the target value of 200g." 
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.split(';')[0].split(':')[1],
            data: image.split(',')[1]
          }
        }
      ];
      
      const analysisResponse = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        temperature: 0.1,
        system: "You are a medical measurement analysis system. Your job is to analyze images of scales, extract the exact weight measurement shown, and determine if it has overshot a target value. Be precise in your reading of numeric values.",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ]
      });
      
      const analysisText = analysisResponse.content[0].text.trim();
      
      // Try to extract the weight value from the response
      let weight = null;
      let unit = null;
      let hasOvershot = false;
      
      // Extract numbers and common weight units (g, mg, kg)
      const weightMatch = analysisText.match(/(\d+(?:\.\d+)?)\s*(g|mg|kg)/i);
      if (weightMatch) {
        weight = parseFloat(weightMatch[1]);
        unit = weightMatch[2].toLowerCase();
        
        // Convert to grams for comparison
        let weightInGrams = weight;
        if (unit === 'mg') {
          weightInGrams = weight / 1000;
        } else if (unit === 'kg') {
          weightInGrams = weight * 1000;
        }
        
        // Determine if it has overshot the target
        hasOvershot = weightInGrams > targetWeight;
      }
      
      return res.json({
        success: true,
        analysis: analysisText,
        analysis_file: imagePath ? path.basename(imagePath) : null,
        weight: weight,
        unit: unit,
        targetWeight: targetWeight,
        hasOvershot: hasOvershot,
        weightInGrams: weight !== null ? (unit === 'mg' ? weight / 1000 : (unit === 'kg' ? weight * 1000 : weight)) : null
      });
    } catch (apiError) {
      console.error('Error in Claude API call for weight analysis:', apiError);
      
      // Fallback: provide a generic analysis
      return res.json({
        success: true,
        analysis: "The image appears to show a scale measurement. Due to current system limitations, I'm unable to precisely read the value. Please verify the measurement manually to determine if it exceeds the target of 200g.",
        analysis_file: imagePath ? path.basename(imagePath) : null,
        is_fallback: true,
        fallback_reason: "API error - using simulated result"
      });
    }
  } catch (error) {
    console.error('Error in weight measurement analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing weight analysis request'
    });
  }
});

// Process data endpoint
app.post('/api/process', async (req, res) => {
  try {
    console.log('Received request');
    
    // Extract text and image from request
    const { text, image } = req.body;
    
    // Log received data
    console.log(`Received text: ${text ? 'Yes' : 'No'}, length: ${text ? text.length : 0}`);
    console.log(`Received image: ${image ? 'Yes' : 'No'}, length: ${image ? image.length : 0}`);
    
    // Check if we have any data to process
    if (!text && !image) {
      return res.status(400).json({
        success: false,
        error: 'No valid text or image data was provided'
      });
    }
    
    // Prepare message content with direct instruction to answer rather than summarize
    let messageContent = [
      { type: "text", text: `Extract all numerical medical information from the following transcript and format it as medical log entries.

Examples:
- For "I'm giving the patient 5 mg of opioids now" → "5 mg of opioids administered to patient"
- For "The patient's heart rate is 72 BPM and blood pressure is 120/80" → "Heart rate: 72 BPM, Blood pressure: 120/80"
- For "We need to increase the dosage to 10 units" → "Dosage increased to 10 units"

Follow these rules:
1. Only extract information with numerical values and their medical context
2. Format each entry as a clear, concise medical log entry
3. Include the unit of measurement with each number
4. Use professional, concise medical terminology
5. Omit all non-medical numerical information
6. Format as a numbered list if multiple entries are found
7. If no numerical medical information is found, respond with "No medical measurements recorded"

Transcript: ${text || 'No text provided'}` }
    ];
    
    // Process image if provided
    let imagePath = null;
    if (image && image.startsWith('data:image')) {
      try {
        // Extract base64 image data
        const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const imageType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Save image to file
          const filename = generateUniqueFilename(imageType);
          imagePath = path.join(mediaDir, filename);
          fs.writeFileSync(imagePath, buffer);
          console.log(`Image saved to ${imagePath}`);
          
          // Add image to message
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: `image/${imageType}`,
              data: base64Data
            }
          });
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
    
    // Call Anthropic API
    console.log('Calling Claude API...');
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0,
      system: "You are a medical scribe assistant specialized in extracting and formatting numerical medical information from clinical speech. Your role is to transform conversational speech into professional medical log entries that precisely capture dosages, vital signs, measurements, and other quantitative medical data. Format each entry in a clear, concise style appropriate for a medical record, always preserving the numerical values, units, and clinical context. Focus only on medically relevant information with numerical components.",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    });
    
    const answer = response.content[0].text;
    console.log(`Received response from Claude API with length: ${answer.length}`);
    
    // Save answer to file
    const summaryFilename = generateUniqueFilename('txt');
    const summaryPath = path.join(summariesDir, summaryFilename);
    fs.writeFileSync(summaryPath, answer);
    console.log(`Answer saved to ${summaryPath}`);
    
    // Return response
    return res.status(200).json({
        success: true,
        summary: answer,
      summary_file: summaryFilename,
        image_file: imagePath ? path.basename(imagePath) : null
      });
        
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running'
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API endpoint: http://localhost:${port}/api/process`);
  console.log(`Media files will be saved to ${mediaDir}`);
}); 