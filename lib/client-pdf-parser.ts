'use client';

import { BIAEntry } from './types';
import { parseBIAReport } from './pdf-parser';
import Tesseract from 'tesseract.js';

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: string) => void
): Promise<string> {
  onProgress?.('Scanning image...');

  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(`Scanning: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  console.log('Image OCR extracted text length:', result.data.text.length);
  return result.data.text;
}

export async function parseFile(
  file: File,
  onProgress?: (progress: string) => void
): Promise<{ entry: BIAEntry; rawText: string }> {
  // Only support image files now
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (PNG, JPG). PDF is no longer supported.');
  }

  const text = await extractTextFromImage(file, onProgress);
  onProgress?.('Parsing data...');
  return { entry: parseBIAReport(text), rawText: text };
}

// Keep old name for backwards compatibility
export const parsePDFFile = parseFile;
