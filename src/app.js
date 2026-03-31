import { recognizeImage } from './ocr.js';
import { formatTextMode, formatCodeMode, streamText } from './format.js';
import { formatCodeWithLLM } from './llm.js';

const state = {
  images: [],
  isProcessing: false,
  currentOcrMode: 'text'
};

const elements = {
  dropZone: document.getElementById('dropZone'),
  imagesPreview: document.getElementById('imagesPreview'),
  processBtn: document.getElementById('processBtn'),
  clearBtn: document.getElementById('clearBtn'),
  progressContainer: document.getElementById('progressContainer'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  outputText: document.getElementById('outputText'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  themeToggle: document.getElementById('themeToggle'),
  charCount: document.getElementById('charCount'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage')
};

const isLLMEnabled = Boolean(import.meta.env.VITE_HF_API_TOKEN);
let hasShownAIWarning = false;

export function initApp() {
  loadTheme();
  bindEvents();
  updateProcessButton();
}

function bindEvents() {
  elements.themeToggle.addEventListener('click', toggleTheme);

  document.querySelectorAll('.ocr-mode-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.ocr-mode-btn').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      state.currentOcrMode = button.getAttribute('data-mode');
      if (state.currentOcrMode === 'code' && !isLLMEnabled && !hasShownAIWarning) {
        showToast('Code mode is running without AI formatting. Set VITE_HF_API_TOKEN in .env to enable it.', 'warning');
        hasShownAIWarning = true;
      }
    });
  });

  elements.outputText.addEventListener('input', updateCharCount);

  document.addEventListener('paste', handlePaste);
  document.addEventListener('keydown', handleKeyDown);

  elements.downloadBtn.addEventListener('click', downloadText);
  elements.copyBtn.addEventListener('click', copyText);
  elements.clearBtn.addEventListener('click', clearAll);
  elements.processBtn.addEventListener('click', processImages);

  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.dropZone.addEventListener('click', handleDropZoneClick);

  window.addEventListener('load', () => {
    document.body.focus();
  });
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

function showToast(message, type = 'success') {
  elements.toastMessage.textContent = message;
  elements.toast.className = `toast show toast-${type}`;
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

function updateCharCount() {
  const count = elements.outputText.value.length;
  elements.charCount.textContent = `${count.toLocaleString()} character${count !== 1 ? 's' : ''}`;
}

function handlePaste(event) {
  const items = event.clipboardData?.items || [];
  let hasImage = false;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        addImage(blob);
        hasImage = true;
      }
    }
  }

  if (hasImage) {
    event.preventDefault();
    showToast('Image pasted successfully', 'success');
  }
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
    if (state.images.length > 0 && !state.isProcessing && document.activeElement !== elements.outputText) {
      event.preventDefault();
      processImages();
    }
  }
}

function handleDragOver(event) {
  event.preventDefault();
  elements.dropZone.classList.add('dragover');
}

function handleDragLeave() {
  elements.dropZone.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  elements.dropZone.classList.remove('dragover');
  const files = Array.from(event.dataTransfer.files || []);
  files.forEach((file) => {
    if (file.type.startsWith('image/')) {
      addImage(file);
    }
  });
}

function handleDropZoneClick() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => addImage(file));
  };
  input.click();
}

function addImage(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const imageData = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      dataUrl: event.target.result
    };

    state.images.push(imageData);
    renderImages();
    updateProcessButton();
  };
  reader.readAsDataURL(file);
}

function renderImages() {
  elements.imagesPreview.innerHTML = '';

  state.images.forEach((image, index) => {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.innerHTML = `
      <img src="${image.dataUrl}" alt="Image ${index + 1}" />
      <div class="image-overlay"></div>
      <button class="remove-btn" data-id="${image.id}">×</button>
    `;

    elements.imagesPreview.appendChild(imageItem);
  });

  document.querySelectorAll('.remove-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = button.getAttribute('data-id');
      if (id) {
        removeImage(id);
      }
    });
  });
}

function removeImage(id) {
  state.images = state.images.filter((image) => image.id !== id);
  renderImages();
  updateProcessButton();
  showToast('Image removed', 'success');
}

function updateProcessButton() {
  elements.processBtn.disabled = state.images.length === 0 || state.isProcessing;
}

function clearAll() {
  if (state.isProcessing) {
    return;
  }

  state.images = [];
  renderImages();
  updateProcessButton();
  elements.outputText.value = '';
  elements.charCount.textContent = '0 characters';
  elements.progressContainer.style.display = 'none';
  showToast('All cleared', 'success');
}

function downloadText() {
  if (!elements.outputText.value) {
    showToast('No text to download', 'error');
    return;
  }

  const blob = new Blob([elements.outputText.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ocr-export-${Date.now()}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  showToast('Downloaded successfully', 'success');
}

function copyText() {
  if (!elements.outputText.value) {
    showToast('No text to copy', 'error');
    return;
  }

  navigator.clipboard.writeText(elements.outputText.value)
    .then(() => {
      elements.copyBtn.textContent = '✓ Copied';
      elements.copyBtn.classList.add('copied');
      showToast('Copied to clipboard', 'success');
      setTimeout(() => {
        elements.copyBtn.textContent = 'Copy';
        elements.copyBtn.classList.remove('copied');
      }, 2000);
    })
    .catch(() => {
      elements.outputText.select();
      document.execCommand('copy');
      showToast('Copied to clipboard', 'success');
    });
}

async function processImages() {
  if (state.images.length === 0 || state.isProcessing) {
    return;
  }

  state.isProcessing = true;
  updateProcessButton();
  elements.progressContainer.style.display = 'block';
  elements.outputText.value = '';
  updateCharCount();

  const total = state.images.length;

  for (let index = 0; index < total; index += 1) {
    const image = state.images[index];
    const progress = Math.round(((index + 1) / total) * 100);

    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.innerHTML = `<span class="loading-spinner"></span>Processing image ${index + 1} of ${total}...`;

    try {
      if (index > 0) {
        await streamText('\n\n' + '='.repeat(50) + '\n\n', elements.outputText);
      }

      const text = await recognizeImage(image.dataUrl, state.currentOcrMode === 'code', (progressValue) => {
        const percent = Math.round(progressValue * 100);
        elements.progressText.innerHTML = `<span class="loading-spinner"></span>Processing image ${index + 1} of ${total} (${percent}%)...`;
      });

      let formattedText = '';

      if (state.currentOcrMode === 'code') {
        const cleanedCode = formatCodeMode(text.trim());
        if (isLLMEnabled) {
          elements.progressText.innerHTML = `<span class="loading-spinner"></span>Formatting code with AI...`;

          try {
            formattedText = await formatCodeWithLLM(cleanedCode);
          } catch (error) {
            console.warn('LLM formatting failed:', error);
            formattedText = cleanedCode;
            showToast('AI formatting failed, showing cleaned text', 'warning');
          }
        } else {
          formattedText = cleanedCode;
          if (!hasShownAIWarning) {
            showToast('AI formatting disabled. Output is cleaned OCR text only.', 'warning');
            hasShownAIWarning = true;
          }
        }
      } else {
        formattedText = formatTextMode(text.trim());
      }

      await streamText(formattedText + '\n', elements.outputText);
    } catch (error) {
      console.error('OCR error:', error);
      await streamText(`Error processing image: ${error.message}\n`, elements.outputText);
      showToast('Error processing image', 'error');
    }
  }

  elements.progressText.textContent = '✓ Processing complete!';
  showToast(`Successfully processed ${total} image${total !== 1 ? 's' : ''}`, 'success');

  setTimeout(() => {
    elements.progressContainer.style.display = 'none';
  }, 2000);

  state.isProcessing = false;
  updateProcessButton();
}
