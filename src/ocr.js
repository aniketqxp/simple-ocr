import Tesseract from 'tesseract.js';

export async function recognizeImage(imageUrl, isCodeMode, onProgress) {
  const options = {
    logger: (message) => {
      if (onProgress && message.status === 'recognizing text') {
        onProgress(message.progress);
      }
    }
  };

  if (isCodeMode) {
    options.tessedit_pageseg_mode = Tesseract.PSM.SINGLE_BLOCK;
    options.preserve_interword_spaces = '1';
  }

  const result = await Tesseract.recognize(imageUrl, 'eng', options);
  return result.data.text;
}
