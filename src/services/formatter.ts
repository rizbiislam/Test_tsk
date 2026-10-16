/**
 * Meeting Timeline — Timeline & Q&A Synthesizer (OOP Architecture)
 *
 * Converts raw dialogue text into structured executive deliverables:
 *  1. Smart Question & Answer Detection with Paired Responses
 *  2. Executive Summary Paragraphs
 *  3. Noise & Speech Artifact Filtering
 *  4. Presentation Statistics Computation
 *
 * Developer: Rizbi Islam • AeroTech
 */

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
 * Object-Oriented Timeline & Dialogue Synthesizer
 */
export class TimelineSynthesizer {
  private static instance: TimelineSynthesizer | null = null;

  private readonly sentenceDelimiters = /([.!?])\s+(?=[A-Z0-9])/g;
  private readonly speechFillerPattern =
    /\b(uh|um|uh-huh|hmm|like|you know|i mean|basically|literally|actually|right\?|okay so|so uh|so um)\b,?\s*/gi;
  private readonly questionStarters =
    /^(what|why|how|who|where|when|which|can|could|would|should|is|are|was|were|do|does|did|have|has|had|will|shall|may|might)\b/i;

  public static getInstance(): TimelineSynthesizer {
    if (!TimelineSynthesizer.instance) {
      TimelineSynthesizer.instance = new TimelineSynthesizer();
    }
    return TimelineSynthesizer.instance;
  }

  public capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  public isQuestion(sentence: string): boolean {
    const trimmed = sentence.trim();
    if (trimmed.endsWith('?')) return true;
    if (this.questionStarters.test(trimmed)) {
      const count = trimmed.split(/\s+/).length;
      if (count >= 3 && count <= 30) {
        return true;
      }
    }
    return false;
  }

  public splitIntoSentences(text: string): string[] {
    const marked = text.replace(this.sentenceDelimiters, '$1\n');
    return marked
      .split('\n')
      .map((s) => this.capitalize(s.trim()))
      .filter((s) => s.length > 3);
  }

  public groupIntoParagraphs(sentences: string[], perParagraph = 4): string[] {
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += perParagraph) {
      const chunk = sentences.slice(i, i + perParagraph);
      paragraphs.push(chunk.join(' '));
    }
    return paragraphs;
  }

  public buildQABlocks(sentences: string[]): {
    blocks: QABlock[];
    questionCount: number;
    formattedText: string;
  } {
    const blocks: QABlock[] = [];
    let questionCount = 0;
    const textOutputParts: string[] = [];

    let i = 0;
    let statementBuffer: string[] = [];

    const flushStatements = () => {
      if (statementBuffer.length > 0) {
        const text = statementBuffer.join(' ');
        blocks.push({
          id: `stmt-${blocks.length}`,
          type: 'paragraph',
          text,
        });
        textOutputParts.push(text);
        statementBuffer = [];
      }
    };

    while (i < sentences.length) {
      const sentence = sentences[i];

      if (this.isQuestion(sentence)) {
        flushStatements();
        questionCount++;

        let questionText = sentence;
        if (!questionText.endsWith('?')) {
          questionText += '?';
        }

        const answerSentences: string[] = [];
        let j = i + 1;
        while (
          j < sentences.length &&
          !this.isQuestion(sentences[j]) &&
          answerSentences.length < 3
        ) {
          answerSentences.push(sentences[j]);
          j++;
        }

        const answerText = answerSentences.join(' ');

        blocks.push({
          id: `qa-${blocks.length}`,
          type: 'question_answer',
          question: questionText,
          answer: answerText || undefined,
          text: answerText
            ? `Q: ${questionText}\nA: ${answerText}`
            : `Q: ${questionText}`,
        });

        if (answerText) {
          textOutputParts.push(`Q: ${questionText}\nA: ${answerText}`);
        } else {
          textOutputParts.push(`Q: ${questionText}`);
        }

        i = j;
      } else {
        statementBuffer.push(sentence);
        if (statementBuffer.length >= 4) {
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
   * Main synthesis pipeline: Transforms raw transcript into presentation-grade deliverables.
   */
  public format(rawText: string, _serverQaText?: string): FormattedTranscript {
    // 1. Whitespace & bracket normalization
    let text = rawText
      .replace(/\s+/g, ' ')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    // 2. Remove verbal filler words
    text = text.replace(this.speechFillerPattern, ' ').replace(/\s+/g, ' ').trim();

    // 3. Sentence capitalization
    text = this.capitalize(text);
    if (text && !/[.!?]$/.test(text)) text += '.';

    // 4. Sentence extraction
    const sentences = this.splitIntoSentences(text);

    // 5. Paragraph grouping
    const paragraphs = this.groupIntoParagraphs(sentences, 4);

    // 6. Q&A synthesis
    const { blocks: qaBlocks, questionCount, formattedText: qaFormattedText } =
      this.buildQABlocks(sentences);

    // 7. Metrics calculation
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    const charCount = text.length;

    return {
      paragraphs,
      qaBlocks,
      qaFormattedText,
      questionCount,
      wordCount,
      readTimeMinutes,
      charCount,
      rawText,
    };
  }
}

// ── Backwards Compatibility Export ──────────────────────────────────────────
export const timelineSynthesizer = TimelineSynthesizer.getInstance();
export const formatTranscript = (rawText: string, serverQaText?: string) =>
  timelineSynthesizer.format(rawText, serverQaText);
