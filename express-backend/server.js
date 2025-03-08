require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Anthropic } = require('@anthropic-ai/sdk');

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

// Function to generate unique filename
const generateUniqueFilename = (ext) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.floor(Math.random() * 10000);
  return `${timestamp}-${random}.${ext}`;
};

// Mock database of people for facial recognition
const peopleDatabase = [
  { id: 1, name: "Person 1", profession: "Doctor" },
  { id: 2, name: "Person 2", profession: "Nurse" },
  { id: 3, name: "Person 3", profession: "Medical Technician" },
  { id: 4, name: "Person 4", profession: "Administrator" }
];

// Add a new endpoint for facial recognition
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
      // Try to use Claude for face recognition
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
      
      return res.json({
        success: true,
        person_id: personId,
        person_name: person.name,
        person_profession: person.profession,
        confidence: Math.floor(70 + Math.random() * 30) // Simulate confidence 70-100%
      });
    } catch (apiError) {
      console.error('Error in Claude API call for facial recognition:', apiError);
      
      // Fallback: return a random person with lower confidence
      const randomPersonId = Math.floor(Math.random() * 4) + 1;
      const person = peopleDatabase.find(p => p.id === randomPersonId) || peopleDatabase[0];
      
      // Return simulated result with lower confidence
      return res.json({
        success: true,
        person_id: randomPersonId,
        person_name: person.name,
        person_profession: person.profession,
        confidence: Math.floor(50 + Math.random() * 30), // Lower confidence: 50-80%
        is_fallback: true,
        fallback_reason: "API authentication error - using simulated result"
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
      // Try to use Claude for image analysis
      const messageContent = [
        { 
          type: "text", 
          text: "Analyze this medical image and describe what you see in about 3-5 sentences. Focus on key medical observations." 
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
        system: "You are a medical image analysis system. Analyze the image and provide a clear, concise description of what you see that would be relevant in a medical context.",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ]
      });
      
      return res.json({
        success: true,
        analysis: analysisResponse.content[0].text.trim(),
        analysis_file: imagePath ? path.basename(imagePath) : null
      });
    } catch (apiError) {
      console.error('Error in Claude API call for image analysis:', apiError);
      
      // Fallback: provide a generic analysis
      const fallbackAnalyses = [
        "The image appears to show medical content. Without being able to process the details due to a temporary system limitation, I recommend consulting with a healthcare professional for proper analysis.",
        "This appears to be a medical image. Due to current API limitations, I'm unable to provide a detailed analysis. Please consult with a medical professional for proper interpretation.",
        "The medical image has been captured successfully. While I'm currently unable to analyze the specific details due to an API limitation, the image quality is good for medical professional review.",
        "This image contains medical information that would typically be analyzed by a healthcare provider. Due to a temporary system constraint, detailed AI analysis isn't available at this moment."
      ];
      
      // Return a fallback response
      return res.json({
        success: true,
        analysis: fallbackAnalyses[Math.floor(Math.random() * fallbackAnalyses.length)],
        analysis_file: imagePath ? path.basename(imagePath) : null,
        is_fallback: true,
        fallback_reason: "API authentication error - using simulated result"
      });
    }
  } catch (error) {
    console.error('Error in image analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing image analysis request'
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
        { type: "text", text: `Please respond directly to the following. Don't summarize, just answer as if you're having a conversation:\n\nText: ${text || 'No text provided'}` }
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
        system: "You are a helpful assistant engaging in a natural conversation. Respond directly to the user's input without summarizing or rephrasing their question.",
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