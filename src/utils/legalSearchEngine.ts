/**
 * Vietnamese Legal Natural Language Processing & Search Engine
 * Tailored for Vietnamese statutory documents (Bộ luật, Luật, Nghị định, Thông tư, Hợp đồng)
 */

export const VIETNAMESE_STOPWORDS = new Set([
  'là', 'của', 'và', 'các', 'những', 'trong', 'được', 'có', 'cho', 'với',
  'khi', 'nào', 'gì', 'thế', 'nào', 'bao', 'nhiêu', 'lâu', 'mấy', 'thì',
  'ở', 'tại', 'về', 'do', 'bị', 'một', 'hai', 'ba', 'bốn', 'năm', 'để',
  'theo', 'từ', 'lên', 'ra', 'vào', 'hay', 'hoặc', 'mà', 'như', 'nhất',
  'đang', 'đã', 'sẽ', 'cần', 'phải', 'muốn', 'người', 'hãy', 'cho', 'biết',
  'hỏi', 'xin', 'văn', 'bản', 'quy', 'định', 'luật', 'tôi', 'em', 'anh',
  'chị', 'trường', 'hợp', 'nội', 'dung', 'đoạn', 'trang', 'xem'
]);

export interface ParsedClause {
  label: string; // e.g. "Khoản 1", "Khoản 2", "Điểm a"
  text: string;
}

export interface LegalArticle {
  docName: string;
  articleNumber: string | null; // e.g. "Điều 35"
  articleTitle: string; // e.g. "Quyền đơn phương chấm dứt hợp đồng lao động..."
  label: string; // e.g. "Điều 35" or "Trang 2" or "Đoạn 5"
  fullText: string;
  clauses: ParsedClause[];
  sourcePage?: number | string;
}

export interface SearchKeywordInfo {
  rawKeywords: string[];
  cleanKeywords: string[];
  phrases: string[];
  targetArticle: string | null;
  targetClause: string | null;
}

// Helper to escape regex special characters
export function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Auto-detects the official statutory or legal title from the document content.
 * e.g. "Bộ luật Lao động (Số 45/2019/QH14)" or "Nghị định 152/2020/NĐ-CP"
 */
export function detectLegalDocumentTitle(rawText: string, fallbackFileName: string): string {
  if (!rawText || rawText.trim().length === 0) {
    return cleanFileName(fallbackFileName);
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 30); // Look in the first 30 lines

  // 1. Look for statutory document type headers: BỘ LUẬT, LUẬT, NGHỊ ĐỊNH, THÔNG TƯ, PHÁP LỆNH, HỢP ĐỒNG, QUY CHẾ
  let detectedType = '';
  let detectedNumber = '';
  let detectedSubject = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for document number line e.g. "Số: 45/2019/QH14" or "Số 152/2020/NĐ-CP"
    const numMatch = line.match(/(?:Số|Số:)\s*([0-9]+\/[0-9]+\/[A-Za-z0-9_-]+|[0-9]+\/[A-Za-z0-9_-]+)/i);
    if (numMatch && !detectedNumber) {
      detectedNumber = numMatch[1];
    }

    // Check for major title line in UPPERCASE or Title Case
    const typeMatch = line.match(/^(BỘ LUẬT\s+[^\n\r]+|LUẬT\s+[^\n\r]+|NGHỊ ĐỊNH|THÔNG TƯ|QUYẾT ĐỊNH|PHÁP LỆNH|HỢP ĐỒNG\s+[^\n\r]+|QUY CHẾ\s+[^\n\r]+)/i);
    if (typeMatch && !detectedType) {
      detectedType = line;
      // If it's just "NGHỊ ĐỊNH" or "THÔNG TƯ", check next lines for subject (e.g. "Quy định về...")
      if (/^(?:NGHỊ ĐỊNH|THÔNG TƯ|QUYẾT ĐỊNH)$/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.length > 5 && !nextLine.toLowerCase().includes('chính phủ') && !nextLine.toLowerCase().includes('số:')) {
          detectedSubject = nextLine;
        }
      }
    }
  }

  if (detectedType) {
    let title = detectedType;
    if (detectedSubject && detectedSubject.length < 90) {
      title += ` - ${detectedSubject}`;
    }
    if (detectedNumber && !title.includes(detectedNumber)) {
      title += ` (Số ${detectedNumber})`;
    }
    if (title.length > 10 && title.length < 120) {
      return title;
    }
  }

  return cleanFileName(fallbackFileName);
}

function cleanFileName(fileName: string): string {
  return (fileName || 'Văn bản pháp luật')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

/**
 * Deep text cleaner for PDF, Word, and text files.
 * Normalizes Unicode to NFC (vital for Vietnamese search accuracy),
 * strips repetitive national headers/footers, unifies line breaks,
 * joins hyphenated line wraps, and cleans PDF formatting noise.
 */
export function cleanExtractedText(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    // Remove control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace non-breaking spaces and special spaces with standard space
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Remove soft hyphens
    .replace(/\u00AD/g, '')
    // Strip repeating boilerplate headers like "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" & "Độc lập - Tự do - Hạnh phúc"
    .replace(/CỘNG\s*HÒA\s*XÃ\s*HỘI\s*CHỦ\s*NGHĨA\s*VIỆT\s*NAM[\s\S]*?Độc\s*lập\s*-\s*Tự\s*do\s*-\s*Hạnh\s*phúc/gi, ' ')
    // Strip repeating page number lines like "Trang 1 / 50" or "- 12 -"
    .replace(/(?:^|\n)\s*(?:Trang\s+\d+(?:\s*\/\s*\d+)?|-\s*\d+\s*-)\s*(?=\n|$)/gi, '\n')
    // Fix words split across lines with hyphen (e.g. "thời-\n hạn" -> "thời hạn")
    .replace(/([a-zA-Z\u00C0-\u1EF9]+)-\s*\n\s*([a-zA-Z\u00C0-\u1EF9]+)/g, '$1$2')
    // Fix Vietnamese syllable split across single newlines in formatted tables
    .replace(/([a-zA-Z\u00C0-\u1EF9]+)\s*\n\s*([a-zA-Z\u00C0-\u1EF9]+)(?=\s+[a-zA-Z\u00C0-\u1EF9]+)/g, (match, p1, p2) => {
      // If line doesn't end with sentence terminator and isn't header
      if (['Điều', 'Khoản', 'Điểm', 'Chương', 'Mục', 'Phần'].includes(p1)) return `${p1} ${p2}`;
      return `${p1} ${p2}`;
    })
    // Unify carriage returns to standard newline
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove empty line tabs/spaces
    .replace(/\n[ \t]+\n/g, '\n\n')
    // Limit excessive consecutive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/**
 * Extract meaningful legal keywords and multi-word phrases from a question
 */
export function extractLegalQueryInfo(question: string): SearchKeywordInfo {
  const normalized = (question || '').normalize('NFC').toLowerCase();

  // 1. Detect target article pattern: "Điều 35", "Điều 125", "Điều 429", "Điều 8"
  const articleMatch = normalized.match(/(?:điều|đ\.)\s+(\d+([a-z0-9_.-]*)?)/i);
  const targetArticle = articleMatch ? `Điều ${articleMatch[1]}` : null;

  // 2. Detect clause pattern: "Khoản 1", "Khoản 2", "Điểm a"
  const clauseMatch = normalized.match(/khoản\s+(\d+)/i);
  const targetClause = clauseMatch ? `Khoản ${clauseMatch[1]}` : null;

  // 3. Extract words and filter stopwords
  const rawWords = normalized
    .replace(/[^\w\s\u00A0-\u024F\u1EA0-\u1EF9]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const cleanKeywords = rawWords.filter(
    (w) => w.length > 1 && !VIETNAMESE_STOPWORDS.has(w)
  );

  // 4. Generate multi-word phrases (bigrams, trigrams, 4-grams)
  const phrases: string[] = [];
  const wordsForPhrases = rawWords.filter(
    (w) => !['tôi', 'cho', 'biết', 'hãy', 'hỏi', 'xin'].includes(w)
  );

  // Bigrams
  for (let i = 0; i < wordsForPhrases.length - 1; i++) {
    const p = `${wordsForPhrases[i]} ${wordsForPhrases[i + 1]}`;
    if (p.length > 4 && !phrases.includes(p)) {
      phrases.push(p);
    }
  }

  // Trigrams
  for (let i = 0; i < wordsForPhrases.length - 2; i++) {
    const p = `${wordsForPhrases[i]} ${wordsForPhrases[i + 1]} ${wordsForPhrases[i + 2]}`;
    if (!phrases.includes(p)) {
      phrases.push(p);
    }
  }

  // 4-grams for common legal expressions
  for (let i = 0; i < wordsForPhrases.length - 3; i++) {
    const p = `${wordsForPhrases[i]} ${wordsForPhrases[i + 1]} ${wordsForPhrases[i + 2]} ${wordsForPhrases[i + 3]}`;
    if (!phrases.includes(p)) {
      phrases.push(p);
    }
  }

  return {
    rawKeywords: rawWords,
    cleanKeywords,
    phrases,
    targetArticle,
    targetClause,
  };
}

/**
 * Parses legal document text into structured Articles and Clauses
 */
export function parseDocumentArticles(
  text: string,
  docName: string,
  fallbackParas?: { label: string; text: string }[]
): LegalArticle[] {
  let cleanedText = cleanExtractedText(text);

  if (!cleanedText && fallbackParas && fallbackParas.length > 0) {
    cleanedText = cleanExtractedText(fallbackParas.map((p) => p.text).join('\n\n'));
  }

  if (!cleanedText) return [];

  const articles: LegalArticle[] = [];

  // Match Vietnamese statutory article headers:
  // "Điều 1.", "Điều 35:", "ĐIỀU 125.", "Điều 429.-", "Điều 8"
  const articleRegex = /(?:^|\n)\s*((?:Điều|ĐIỀU|ĐIÈU)\s+\d+([a-z0-9_.-]*)\.?\s*[-–—:]?\s*([^\n\r]*))/gi;
  const matches: { index: number; fullHeader: string; artNum: string; title: string }[] = [];

  let match;
  while ((match = articleRegex.exec(cleanedText)) !== null) {
    const fullHeader = match[1].trim();
    const artNumMatch = fullHeader.match(/(?:Điều|ĐIỀU|ĐIÈU)\s+\d+([a-z0-9_.-]*)?/i);
    const artNum = artNumMatch ? artNumMatch[0].replace(/ĐIỀU|ĐIÈU/i, 'Điều') : 'Điều';
    const title = fullHeader
      .replace(/(?:Điều|ĐIỀU|ĐIÈU)\s+\d+([a-z0-9_.-]*)?[\.\:–—-]?\s*/i, '')
      .trim();

    matches.push({
      index: match.index,
      fullHeader,
      artNum,
      title,
    });
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : cleanedText.length;
      const articleBody = cleanedText.slice(cur.index, nextIndex).trim();

      // If title was on the line right below the article header
      let finalTitle = cur.title;
      const bodyLines = articleBody.split('\n');
      if (!finalTitle && bodyLines.length > 1) {
        const candidateLine = bodyLines[1].trim();
        // If line is not a clause number like "1.", use as title
        if (candidateLine && !/^\d+\./.test(candidateLine) && !/^Khoản\s+\d+/i.test(candidateLine)) {
          finalTitle = candidateLine;
        }
      }

      // Parse clauses inside this article (Khoản 1., Khoản 2., 1., 2., a), b))
      const clauses: ParsedClause[] = [];
      const clauseLines = articleBody.split(/\n(?=(?:\d+\.|\bKhoản\s+\d+))/gi);

      clauseLines.forEach((cText, cIdx) => {
        const trimmed = cText.trim();
        if (trimmed) {
          const clauseNumMatch = trimmed.match(/^(?:Khoản\s+)?(\d+)\.?/i);
          const cLabel = clauseNumMatch ? `Khoản ${clauseNumMatch[1]}` : `Đoạn ${cIdx + 1}`;
          clauses.push({
            label: cLabel,
            text: trimmed,
          });
        }
      });

      articles.push({
        docName,
        articleNumber: cur.artNum,
        articleTitle: finalTitle || cur.artNum,
        label: cur.artNum + (finalTitle ? `: ${finalTitle}` : ''),
        fullText: articleBody,
        clauses: clauses.length > 0 ? clauses : [{ label: 'Toàn văn', text: articleBody }],
      });
    }
    return articles;
  }

  // Fallback: If no "Điều" pattern found, use fallback paragraphs or split by page/paragraph
  if (fallbackParas && fallbackParas.length > 0) {
    fallbackParas.forEach((p, idx) => {
      const isArticle = p.text.match(/(?:Điều|ĐIỀU)\s+\d+/i);
      const cleanP = cleanExtractedText(p.text);
      articles.push({
        docName,
        articleNumber: isArticle ? isArticle[0] : null,
        articleTitle: p.label,
        label: p.label,
        fullText: cleanP,
        clauses: [{ label: p.label, text: cleanP }],
        sourcePage: p.label,
      });
    });
  } else {
    const rawParagraphs = cleanedText.split(/\n\s*\n/).filter((t) => t.trim().length > 0);
    rawParagraphs.forEach((p, idx) => {
      const cleanP = cleanExtractedText(p);
      const isArticle = cleanP.match(/(?:Điều|ĐIỀU)\s+\d+/i);
      articles.push({
        docName,
        articleNumber: isArticle ? isArticle[0] : null,
        articleTitle: `Đoạn ${idx + 1}`,
        label: `Đoạn ${idx + 1}`,
        fullText: cleanP,
        clauses: [{ label: `Đoạn ${idx + 1}`, text: cleanP }],
      });
    });
  }

  return articles;
}

export interface ScoredArticleMatch {
  article: LegalArticle;
  score: number;
  matchedKeywords: string[];
  matchedPhrases: string[];
  bestClause: ParsedClause | null;
  directAnswerSnippet: string;
}

/**
 * Score and rank articles against the query with high precision
 */
export function scoreArticlesForQuery(
  articles: LegalArticle[],
  queryInfo: SearchKeywordInfo,
  question: string
): ScoredArticleMatch[] {
  const { cleanKeywords, phrases, targetArticle, targetClause } = queryInfo;
  const questionLower = (question || '').normalize('NFC').toLowerCase();

  const results: ScoredArticleMatch[] = [];

  for (const art of articles) {
    let score = 0;
    const matchedKws: string[] = [];
    const matchedPhrases: string[] = [];
    const textLower = (art.fullText || '').normalize('NFC').toLowerCase();
    const titleLower = ((art.articleTitle || '') + ' ' + (art.articleNumber || '')).normalize('NFC').toLowerCase();

    // 1. DIRECT ARTICLE NUMBER MATCH: Highest priority
    if (targetArticle && art.articleNumber) {
      const normTarget = targetArticle.normalize('NFC').toLowerCase().replace(/\s+/g, '');
      const normArt = art.articleNumber.normalize('NFC').toLowerCase().replace(/\s+/g, '');
      if (normTarget === normArt) {
        score += 150; // huge boost for matching exact Điều
        matchedKws.push(targetArticle);
      }
    }

    // 2. Exact phrase matching (multi-word legal collocations) across whitespace & linebreaks
    for (const phrase of phrases) {
      if (phrase.length < 5) continue;
      const phraseWords = phrase.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
      if (phraseWords.length === 0) continue;

      const flexiblePhraseRegex = new RegExp(phraseWords.join('\\s+'), 'gi');
      const textMatches = (textLower.match(flexiblePhraseRegex) || []).length;
      const titleMatches = (titleLower.match(flexiblePhraseRegex) || []).length;

      if (titleMatches > 0) {
        score += titleMatches * 40; // Phrase in article title
        matchedPhrases.push(phrase);
      }
      if (textMatches > 0) {
        score += textMatches * 25; // Phrase in article body
        matchedPhrases.push(phrase);
      }
    }

    // 3. Keyword matching (excluding stopwords) with safe Unicode boundary
    for (const kw of cleanKeywords) {
      const safeKwRegex = new RegExp(
        '(?:^|[\\s,.;:!?()"\']|\\[|\\])' + escapeRegex(kw) + '(?=[\\s,.;:!?()"\']|\\[|\\]|$)',
        'gi'
      );
      const textMatches = (textLower.match(safeKwRegex) || []).length;
      const titleMatches = (titleLower.match(safeKwRegex) || []).length;

      if (titleMatches > 0) {
        score += titleMatches * 18;
        matchedKws.push(kw);
      }
      if (textMatches > 0) {
        score += Math.min(textMatches, 6) * 6; // capped so one repeated word doesn't dominate
        matchedKws.push(kw);
      }
    }

    // 4. Check clauses for best matching clause and direct answer
    let bestClause: ParsedClause | null = null;
    let highestClauseScore = -1;

    for (const clause of art.clauses) {
      let cScore = 0;
      const cTextLower = (clause.text || '').normalize('NFC').toLowerCase();

      // Clause number boost if requested (e.g. Khoản 1)
      if (targetClause && clause.label.toLowerCase().includes(targetClause.toLowerCase())) {
        cScore += 45;
      }

      for (const phrase of phrases) {
        const phraseWords = phrase.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
        if (phraseWords.length > 0) {
          const flexibleRegex = new RegExp(phraseWords.join('\\s+'), 'gi');
          if (flexibleRegex.test(cTextLower)) cScore += 22;
        }
      }

      for (const kw of cleanKeywords) {
        const safeRegex = new RegExp(
          '(?:^|[\\s,.;:!?()"\']|\\[|\\])' + escapeRegex(kw) + '(?=[\\s,.;:!?()"\']|\\[|\\]|$)',
          'gi'
        );
        if (safeRegex.test(cTextLower)) cScore += 6;
      }

      // Bonus if clause contains answer metrics (numbers, "ngày", "năm", "nghiêm cấm", "phạt")
      if (/(?:ít nhất|không quá|tối đa|tối thiểu|\d+\s*(?:ngày|tháng|năm|điểm|đồng|triệu)|nghiêm cấm|được|không được)/i.test(clause.text)) {
        cScore += 10;
      }

      if (cScore > highestClauseScore) {
        highestClauseScore = cScore;
        bestClause = clause;
      }
    }

    // Direct answer snippet extraction from best clause
    let directSnippet = '';
    if (bestClause) {
      directSnippet = bestClause.text;
    } else {
      directSnippet = art.fullText.slice(0, 450);
    }

    if (score > 0) {
      results.push({
        article: art,
        score,
        matchedKeywords: Array.from(new Set(matchedKws)),
        matchedPhrases: Array.from(new Set(matchedPhrases)),
        bestClause,
        directAnswerSnippet: directSnippet,
      });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Synthesizes an ultra-accurate direct legal answer in Markdown
 */
export function buildAccurateLegalReport(params: {
  question: string;
  queryInfo: SearchKeywordInfo;
  topMatches: ScoredArticleMatch[];
  selectedDocNames: string[];
  notice?: string;
}): string {
  const { question, queryInfo, topMatches, selectedDocNames, notice } = params;

  let report = `### ⚖️ KẾT QUẢ TRA CỨU PHÁP LUẬT CHÍNH XÁC\n\n`;
  report += `**❓ Câu hỏi tra cứu:** ${question}\n`;
  report += `**📁 Văn bản pháp lý đối chiếu (${selectedDocNames.length} văn bản):** ${selectedDocNames.join(', ')}\n`;
  if (queryInfo.cleanKeywords.length > 0) {
    report += `**🔑 Từ khóa pháp lý trọng tâm:** \`${queryInfo.cleanKeywords.join(' • ')}\`\n`;
  }
  report += `\n---\n\n`;

  if (topMatches.length === 0) {
    report += `### ⚠️ THÔNG BÁO TRA CỨU\n`;
    report += `Không tìm thấy điều khoản hoặc đoạn văn bản nào trong **${selectedDocNames.join(', ')}** khớp với câu hỏi hoặc từ khóa **"${queryInfo.cleanKeywords.join(', ')}"**.\n\n`;
    report += `**Khuyến nghị:**\n`;
    report += `- Rà soát lại câu hỏi hoặc bật thêm văn bản pháp luật liên quan trong danh sách.\n`;
    report += `- Thử tra cứu bằng số hiệu điều khoản (Ví dụ: *"Điều 35"*, *"Điều 125"*, *"Điều 429"*).\n\n`;
    return report;
  }

  const primary = topMatches[0];

  // 1. Direct answer summary
  report += `### 🎯 CÂU TRẢ LỜI TRỰC TIẾP & TRỌNG TÂM\n`;

  // Extract lines and sub-points from directAnswerSnippet
  const lines = primary.directAnswerSnippet
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  let bestAnswerLine = '';
  let highestLineScore = -1;

  for (const line of lines) {
    let lineScore = 0;
    const lower = line.normalize('NFC').toLowerCase();

    for (const phrase of queryInfo.phrases) {
      const phraseWords = phrase.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
      if (phraseWords.length > 0 && new RegExp(phraseWords.join('\\s+'), 'gi').test(lower)) {
        lineScore += 25;
      }
    }
    for (const kw of queryInfo.cleanKeywords) {
      if (lower.includes(kw)) lineScore += 8;
    }
    // Boost if line contains actionable terms: số ngày, số năm, ít nhất, tối đa, nghiêm cấm, phạt
    if (/(?:ít nhất|không quá|tối đa|tối thiểu|\d+\s*(?:ngày|tháng|năm|điểm|đồng|triệu)|nghiêm cấm|bị phạt)/i.test(line)) {
      lineScore += 15;
    }

    if (lineScore > highestLineScore) {
      highestLineScore = lineScore;
      bestAnswerLine = line;
    }
  }

  if (!bestAnswerLine) {
    bestAnswerLine = primary.directAnswerSnippet.slice(0, 300);
  }

  // Format highlighting for key legal numbers/metrics
  const highlightedLine = bestAnswerLine
    .replace(/^[-•*]\s*/, '')
    .replace(
      /(ít nhất \d+\s*(?:ngày|tháng|năm|giờ)|tối đa \d+\s*(?:ngày|tháng|năm|giờ)|không quá \d+\s*(?:ngày|tháng|năm|giờ)|\d+\s*(?:năm|tháng|ngày|giờ|điểm)|nghiêm cấm|vô hiệu)/gi,
      '**$1**'
    );

  const articleCite = [primary.article.articleNumber, primary.bestClause?.label].filter(Boolean).join(' - ') || primary.article.label;

  report += `Theo quy định tại **${primary.article.docName}** (${articleCite}):\n\n`;
  report += `> 📌 **${highlightedLine}**\n\n`;

  if (primary.article.articleTitle && primary.article.articleTitle !== primary.article.articleNumber) {
    report += `*(Thuộc quy định về "${primary.article.articleTitle}")*\n\n`;
  }

  // 2. Specific Citations & Quotes
  report += `### 📍 CĂN CỨ PHÁP LÝ & ĐIỀU KHOẢN TRÍCH LỤC\n`;

  const topToShow = topMatches.slice(0, 3);
  topToShow.forEach((match, idx) => {
    const art = match.article;
    const clauseLabel = match.bestClause ? match.bestClause.label : '';
    const loc = [art.articleNumber, clauseLabel].filter(Boolean).join(' - ') || art.label;

    report += `#### 📌 Căn cứ ${idx + 1}: **${art.docName}** (${loc})\n`;
    if (art.articleTitle && art.articleTitle !== art.articleNumber) {
      report += `- **Tiêu đề điều khoản:** *${art.articleTitle}*\n`;
    }
    report += `- **Độ phù hợp từ khóa:** ${match.score} điểm\n`;
    report += `- **Nội dung trích dẫn nguyên văn:**\n`;

    // Format quote cleanly
    const quoteText = match.bestClause ? match.bestClause.text : art.fullText;
    const cleanQuote = quoteText.length > 500 ? quoteText.substring(0, 500) + '...' : quoteText;
    const formattedQuote = cleanQuote
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');

    report += `${formattedQuote}\n\n`;
  });

  // 3. Analysis & Statutory Context
  report += `### 💡 PHÂN TÍCH & ĐIỀU KIỆN ÁP DỤNG THỰC TẾ\n`;
  report += `- **Chủ thể áp dụng:** Quy định trên áp dụng trực tiếp cho các đối tượng chịu sự điều chỉnh của **${primary.article.docName}**.\n`;
  report += `- **Điều kiện và thủ tục:** Để bảo đảm quyền và lợi ích hợp pháp, người thực hiện cần tuân thủ đúng trình tự, hình thức (bằng văn bản/thông báo) và thời hạn pháp luật quy định cụ thể tại **${primary.article.articleNumber || 'điều luật viện dẫn'}**.\n`;
  report += `- **Giá trị chứng cứ:** Mọi thỏa thuận hoặc thông báo phải được lập thành văn bản hoặc lưu vết dữ liệu điện tử hợp lệ để làm cơ sở chứng minh khi có tranh chấp.\n\n`;

  // 4. Practical Action Items
  report += `### 📌 LƯU Ý & KHUYẾN NGHỊ THỰC HIỆN\n`;
  report += `1. **Kiểm tra thời hiệu và thời hạn:** Luôn lưu ý các mốc thời gian (số ngày báo trước, thời hiệu khởi kiện 03 năm, thời hạn khiếu nại) vì quá thời hạn sẽ mất quyền yêu cầu bảo vệ quyền lợi.\n`;
  report += `2. **Đối chiếu văn bản chuyên ngành:** Trường hợp có sự khác nhau giữa quy định chung và văn bản pháp luật chuyên ngành, áp dụng theo quy định của văn bản luật chuyên ngành.\n`;
  report += `3. **Bảo toàn chứng từ:** Lưu trữ đầy đủ hợp đồng, phụ lục, biên bản bàn giao, phiếu thu tiền hoặc thông báo có chữ ký/xác nhận của các bên.\n\n`;

  if (notice) {
    report += `---\n*${notice}*`;
  }

  return report;
}
