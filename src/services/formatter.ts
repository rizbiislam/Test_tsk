/**
 * AeroTech — Transcript Formatter & Q&A Synthesizer
 *
 * Converts raw transcript text into professional, readable output:
 *  1. Smart Question & Answer Detection (separates questions onto new lines with dedicated answers)
 *  2. Executive Paragraph Mode (clean grouped paragraphs)
 *  3. Normalizes punctuation, removes filler words & speech noise
 *  4. Computes statistics (word count, reading time, questions detected)
 */

const SENTENCE_ENDINGS = /([.!?])\s+(?=[A-Z0-9])/g;
const FILLER_WORDS = /\b(uh|um|uh-huh|hmm|like|you know|i mean|basically|literally|actually|right\?|okay so|so uh|so um)\b,?\s*/gi;

// Question starter keywords
const QUESTION_STARTERS = /^(what|why|how|who|where|when|which|can|could|would|should|is|are|was|were|do|does|did|have|has|had|will|shall|may|might)\b/i;

export interface QABlock {
  id: string;
  type: 'question_answer' | 'paragraph';
  question?: string;
  answer?: string;
  text: string;
}

export interface FormattedTranscript {
  paragraphs: string[];
  qaBlocks: QABlock[];
  qaFormattedText: string;
  questionCount: number;
  wordCount: number;
  readTimeMinutes: number;
  charCount: number;
  rawText: string;
}

/**
 * Capitalizes first letter of a string.
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks whether a sentence is a question based on punctuation or syntax.
 */
function isQuestion(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.endsWith('?')) return true;
  // If sentence starts with question interrogative and has reasonable length
  if (QUESTION_STARTERS.test(trimmed)) {
    const wordCount = trimmed.split(/\s+/).length;
    // Typical question lengths in speech are 4 to 25 words
    if (wordCount >= 3 && wordCount <= 30) {
      return true;
    }
  }
  return false;
}

/**
 * Splits normalized text into distinct sentences.
 */
function splitIntoSentences(text: string): string[] {
  // Replace sentence-ending punctuation followed by space+capital as delimiter
  const marked = text.replace(SENTENCE_ENDINGS, '$1\n');
  return marked
    .split('\n')
    .map(s => capitalize(s.trim()))
    .filter(s => s.length > 3);
}

/**
 * Groups sentences into standard executive paragraph chunks.
 */
function groupIntoParagraphs(sentences: string[], perParagraph = 4): string[] {
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    const chunk = sentences.slice(i, i + perParagraph);
    paragraphs.push(chunk.join(' '));
  }
  return paragraphs;
}

/**
 * Detects Questions and organizes Question-then-Answer on separate lines.
 */
function buildQABlocks(sentences: string[]): { blocks: QABlock[]; questionCount: number; formattedText: string } {
  const blocks: QABlock[] = [];
  let questionCount = 0;
  let textOutputParts: string[] = [];

  let i = 0;
  let currentStatementBuffer: string[] = [];

  const flushStatements = () => {
    if (currentStatementBuffer.length > 0) {
      const text = currentStatementBuffer.join(' ');
      blocks.push({
        id: `stmt-${blocks.length}`,
        type: 'paragraph',
        text,
      });
      textOutputParts.push(text);
      currentStatementBuffer = [];
    }
  };

  while (i < sentences.length) {
    const sentence = sentences[i];

    if (isQuestion(sentence)) {
      flushStatements();
      questionCount++;

      let questionText = sentence;
      if (!questionText.endsWith('?')) {
        questionText += '?';
      }

      // Collect subsequent sentences as the answer (up to 3 sentences or until next question)
      const answerSentences: string[] = [];
      let j = i + 1;
      while (j < sentences.length && !isQuestion(sentences[j]) && answerSentences.length < 3) {
        answerSentences.push(sentences[j]);
        j++;
      }

      const answerText = answerSentences.join(' ');

      blocks.push({
        id: `qa-${blocks.length}`,
        type: 'question_answer',
        question: questionText,
        answer: answerText || undefined,
        text: answerText ? `Q: ${questionText}\nA: ${answerText}` : `Q: ${questionText}`,
      });

      if (answerText) {
        textOutputParts.push(`Q: ${questionText}\nA: ${answerText}`);
      } else {
        textOutputParts.push(`Q: ${questionText}`);
      }

      i = j;
    } else {
      currentStatementBuffer.push(sentence);
      if (currentStatementBuffer.length >= 4) {
        flushStatements();
      }
      i++;
    }
  }

  flushStatements();

  return {
    blocks,
    questionCount,
    formattedText: textOutputParts.join('\n\n'),
  };
}

/**
 * Main formatter — takes raw transcript text, returns structured output with Q&A flow.
 */
export function formatTranscript(rawText: string, serverQaText?: string): FormattedTranscript {
  // Step 1: Basic normalization
  let text = rawText
    .replace(/\s+/g, ' ')            // collapse whitespace
    .replace(/\[.*?\]/g, '')          // remove [Music], [Applause] etc
    .replace(/\(.*?\)/g, '')          // remove (inaudible) etc
    .trim();

  // Step 2: Remove filler words for executive-facing output
  text = text.replace(FILLER_WORDS, ' ').replace(/\s+/g, ' ').trim();

  // Step 3: Capitalize the beginning
  text = capitalize(text);

  // Step 4: Add period at end if missing
  if (text && !/[.!?]$/.test(text)) text += '.';

  // Step 5: Split into sentences
  const sentences = splitIntoSentences(text);

  // Step 6: Group into standard paragraphs
  const paragraphs = groupIntoParagraphs(sentences, 4);

  // Step 7: Build Question-and-Answer structure
  const { blocks: qaBlocks, questionCount, formattedText: qaFormattedText } = buildQABlocks(sentences);

  // Step 8: Compute statistics
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const charCount = text.length;

  return {
    paragraphs,
    qaBlocks,
    qaFormattedText: serverQaText || qaFormattedText,
    questionCount,
    wordCount,
    readTimeMinutes,
    charCount,
    rawText: text,
  };
}
