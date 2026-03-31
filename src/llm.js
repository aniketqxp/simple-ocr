export async function formatCodeWithLLM(code) {
  const apiToken = import.meta.env.VITE_HF_API_TOKEN;
  if (!apiToken) {
    throw new Error('Missing Hugging Face API token in VITE_HF_API_TOKEN.');
  }

  const apiUrl = 'https://router.huggingface.co/v1/chat/completions';
  const systemPrompt = `You are a specialized Code Restoration Engine. Your goal is to recover the original source code from a noisy OCR transcript.
THE MANDATE: Produce a logically verbatim restoration. This means you must fix transcription artifacts while ensuring the functional intent remains unchanged.
1. Fix Syntax Artifacts: Correct obvious OCR errors (e.g., 'def' instead of 'de_f', 'if' instead of '1f', '==' instead of '—') and restore proper indentation.
2. Preserve Logic Gaps: You must NOT implement or expand upon comments. If a comment describes an action, leave it as a comment.
3. Preserve Undefined States: If the code references a variable that isn't defined or a function that isn't imported, do NOT add the definition or the import.
4. No Creative Writing: Do not 'improve' the code, fix bugs, or complete the algorithm. If the original code is incomplete or 'broken,' the restoration must also be incomplete or 'broken.'
OUTPUT: Return ONLY the restored code. No commentary, no markdown wrapping.`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: code }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      top_p: 0.95
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No output generated from LLM.');
  }

  let formattedCode = data.choices[0].message?.content || data.choices[0].text || '';
  formattedCode = formattedCode.replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
  return formattedCode;
}
