const vision = require('@google-cloud/vision');
const fs = require('fs');

// Create client using Application Default Credentials (ADC)
const client = new vision.ImageAnnotatorClient();

// Helper regex patterns for key fields
const regexPatterns = {
  vendor: /Vendor\s*[:\-]?\s*(.+)/i,
  proNumber: /PRO\s*(#|No\.?)?\s*[:\-]?\s*(\w+)/i,
  invoiceDate: /Date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  total: /Total\s*[:\-]?\s*\$?(\d+(?:\.\d{2})?)/i,
  weight: /Weight\s*[:\-]?\s*(\d+(?:\.\d{2})?)/i
};

async function runOCR() {
  try {
    // Replace with your local test image
    const filePath = './sample-invoice.png';
    if (!fs.existsSync(filePath)) {
      console.error('❌ Sample invoice not found:', filePath);
      return;
    }

    // Run OCR
    const [result] = await client.textDetection(filePath);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      console.log('❌ No text detected.');
      return;
    }

    // The full text is in detections[0].description
    const fullText = detections[0].description;
    console.log('✅ Raw OCR text:\n', fullText);

    // Parse fields using regex
    const parsed = {
      vendor_name: (fullText.match(regexPatterns.vendor) || [null, null])[1],
      pro_number: (fullText.match(regexPatterns.proNumber) || [null, null])[2],
      invoice_date: (fullText.match(regexPatterns.invoiceDate) || [null, null])[1],
      invoice_total: (fullText.match(regexPatterns.total) || [null, null])[1],
      weight: (fullText.match(regexPatterns.weight) || [null, null])[1],
      raw_text: fullText
    };

    console.log('\n📦 Parsed fields:', parsed);

  } catch (err) {
    console.error('❌ OCR failed:', err);
  }
}

runOCR();
