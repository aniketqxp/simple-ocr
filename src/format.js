export function formatTextMode(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return text;
  }

  const optionPattern = /^O\s+(.+)|^O(.+)/;
  let optionStartIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (optionPattern.test(lines[index])) {
      optionStartIndex = index;
      break;
    }
  }

  if (optionStartIndex === -1) {
    return lines.join('\n');
  }

  const questionLines = lines.slice(0, optionStartIndex);
  const optionLines = lines.slice(optionStartIndex);
  const questionText = questionLines.join(' ');
  const processedOptions = [];
  let optionCounter = 0;

  for (const line of optionLines) {
    if (optionPattern.test(line)) {
      const match = line.match(optionPattern);
      const optionText = (match[1] || match[2]).trim();
      const optionLabel = String.fromCharCode(65 + optionCounter);
      processedOptions.push(`${optionLabel}. ${optionText}`);
      optionCounter += 1;
    } else if (processedOptions.length > 0) {
      processedOptions[processedOptions.length - 1] += ` ${line}`;
    }
  }

  let result = questionText;
  if (processedOptions.length > 0) {
    result += '\n' + processedOptions.join('\n');
  }
  return result;
}

export function formatCodeMode(text) {
  return cleanOCRText(text);
}

export function cleanOCRText(text) {
  const segments = [];
  let current = '';
  let inString = false;
  let stringDelimiter = null;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if ((char === '"' || char === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inString) {
        if (current) {
          segments.push({ type: 'code', content: current });
        }
        current = char;
        inString = true;
        stringDelimiter = char;
      } else if (char === stringDelimiter) {
        current += char;
        segments.push({ type: 'string', content: current });
        current = '';
        inString = false;
        stringDelimiter = null;
      } else {
        current += char;
      }
    } else {
      current += char;
    }
    i += 1;
  }

  if (current) {
    segments.push({ type: inString ? 'string' : 'code', content: current });
  }

  const processedSegments = segments.map((segment) => {
    if (segment.type === 'string') {
      return segment.content;
    }

    return segment.content
      .replace(/@/g, '0')
      .replace(/©/g, '0')
      .replace(/O(?=[^\w\n])/g, '0')
      .replace(/o(?=[^\w\n])/g, '0')
      .replace(/l(?=[^\w\n])/g, '1')
      .replace(/i(?=[^\w\n])/g, '1')
      .replace(/I(?=[^\w\n])/g, '1')
      .replace(/\|(?=[^\w\n])/g, '1')
      .replace(/S(?=[^\w\n])/g, '5')
      .replace(/B(?=[^\w\n])/g, '8')
      .replace(/Z(?=[^\w\n])/g, '2')
      .replace(/tota1/gi, 'total')
      .replace(/[“”„]/g, '"')
      .replace(/[‘’‚]/g, "'")
      .replace(/C/g, '(')
      .replace(/D/g, ')')
      .replace(/L/g, '[')
      .replace(/J/g, ']')
      .replace(/[=﹦]/g, '=')
      .replace(/[+＋]/g, '+')
      .replace(/[*-](?=\d)/g, (match) => `${match}`)
      .replace(/(\w+)\s*([+\-*\/%%])\s*(\w+)/g, '$1 $2 $3')
      .replace(/(\w+)[ \t]*-([ \t]*[a-zA-Z(])/g, '$1 = $2')
      .replace(/total\s*=\s*n[ \t]*#[ \t]*subtracting\s*a\s*negative/g, 'total -= n # subtracting a negative')
      .replace(/=\s*-\s*(\d+)/g, '== $1')
      .replace(/\s*(<|>|!|=)\s*=/g, '$1=')
      .replace(/=\s*=/g, '==')
      .replace(/\s*([+\-*\/%%]|\*\*|\/\/|<<|>>|&|\^|\|)\s*=/g, '$1=')
      .replace(/(def|class|if|elif|else|for|while|with|try|except|finally|return|print)(?!\s)(?=\w)/g, '$1 ')
      .replace(/(and|or|not|in|is)(?!\s)(?=\w)/g, '$1 ')
      .replace(/(\w+)([<>%]=?|[!=]=)(?=\S)/g, '$1 $2 ')
      .replace(/([<>%]=?|[!=]=)(\w+)/g, '$1 $2')
      .replace(/([<>]=?)\s*o\b/g, '$1 0')
      .replace(/\s+/g, ' ')
      .replace(/^ +/gm, '')
      .trim();
  });

  return processedSegments.join('');
}

export function streamText(text, targetElement) {
  return new Promise((resolve) => {
    const words = text.split(/(\s+)/);
    let currentIndex = 0;

    function appendNext() {
      if (currentIndex < words.length) {
        targetElement.value += words[currentIndex];
        targetElement.scrollTop = targetElement.scrollHeight;
        currentIndex += 1;
        const count = targetElement.value.length;
        document.getElementById('charCount').textContent = `${count.toLocaleString()} character${count !== 1 ? 's' : ''}`;
        setTimeout(appendNext, 1);
      } else {
        resolve();
      }
    }

    appendNext();
  });
}
