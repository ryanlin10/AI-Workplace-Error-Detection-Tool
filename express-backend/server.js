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
const port = process.env.PORT || 5000;

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
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      system: "You are a helpful assistant that responds directly to questions and comments. You engage in natural conversation rather than providing summaries.",
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
      summary_file: summaryFilename
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
}); 