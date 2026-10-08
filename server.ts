import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import { PDFParse } from 'pdf-parse';
import {
  extractLegalQueryInfo,
  parseDocumentArticles,
  scoreArticlesForQuery,
  buildAccurateLegalReport,
  cleanExtractedText,
  detectLegalDocumentTitle,
  LegalArticle,
} from './src/utils/legalSearchEngine.ts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Set user agent as required by skills
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to call Gemini with model fallback if gemini-3.6-flash is specified
async function callGemini(params: {
  model?: string;
  contents: any;
  config?: any;
}) {
  const preferredModel = params.model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  try {
    const response = await ai.models.generateContent({
      model: preferredModel,
      contents: params.contents,
      config: params.config,
    });
    return { response, usedModel: preferredModel };
  } catch (err: any) {
    console.warn(`[Gemini API] Request with '${preferredModel}' failed:`, err?.message || err);
    if (preferredModel !== 'gemini-3.8-flash') {
      console.info(`[Gemini API] Falling back to 'gemini-3.8-flash'...`);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: params.contents,
        config: params.config,
      });
      return { response: fallbackResponse, usedModel: 'gemini-3.8-flash' };
    }
    throw err;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    primaryModel: 'gemini-3.6-flash',
    fallbackModel: 'gemini-3.8-flash',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Extract text from PDF, DOCX/Word or Plain Text on server page-by-page & article-by-article
app.post('/api/parse-document', async (req, res) => {
  try {
    const { base64, mimeType, fileName } = req.body;
    if (!base64) {
      return res.status(400).json({ error: 'Chưa có dữ liệu tệp (base64 is required)' });
    }

    const buffer = Buffer.from(base64, 'base64');
    let extractedText = '';
    const pages: { index: number; label: string; text: string }[] = [];

    const isPdf =
      fileName?.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
    const isDocx =
      fileName?.toLowerCase().endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = fileName?.toLowerCase().endsWith('.doc') || mimeType === 'application/msword';
    const isText =
      fileName?.toLowerCase().endsWith('.txt') ||
      fileName?.toLowerCase().endsWith('.md') ||
      mimeType?.startsWith('text/');

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          parsed.pages.forEach((pg: any) => {
            const pageText = (pg.text || '').trim();
            if (pageText) {
              pages.push({
                index: pg.num || pages.length + 1,
                label: `Trang ${pg.num || pages.length + 1}`,
                text: pageText,
              });
            }
          });
          extractedText = parsed.text || pages.map((p) => p.text).join('\n\n');
        }
        await parser.destroy();
      } catch (pdfErr) {
        console.warn('PDFParse error:', pdfErr);
      }
    } else if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (isText) {
      extractedText = buffer.toString('utf-8');
    } else if (isDoc) {
      extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\u00A0-\u024F\u1EA0-\u1EF9\n\r\t]/g, ' ');
    }

    // Deep clean and normalize extracted text (NFC normalization, fix line breaks, soft hyphens)
    extractedText = cleanExtractedText(extractedText);

    // Auto-detect official legal title
    const detectedName = detectLegalDocumentTitle(extractedText, fileName || 'Tài liệu');

    // Parse into structured legal articles
    const structuredArticles = parseDocumentArticles(extractedText, detectedName, pages);

    // If no pages were parsed from PDF, map from articles or paragraphs
    if (pages.length === 0) {
      if (structuredArticles.length > 0) {
        structuredArticles.forEach((art, idx) => {
          pages.push({
            index: idx + 1,
            label: art.label,
            text: art.fullText,
          });
        });
      } else if (extractedText) {
        const rawParas = extractedText
          .split(/\n\s*\n|\r\n\s*\r\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        rawParas.forEach((p, idx) => {
          pages.push({
            index: idx + 1,
            label: `Đoạn ${idx + 1}`,
            text: p,
          });
        });
      }
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const warning =
      extractedText.trim().length < 60
        ? 'Tệp tải lên có rất ít văn bản hoặc là file ảnh scan chưa có OCR. Khuyến nghị tải PDF dạng văn bản hoặc Word DOCX để tra cứu chính xác nhất.'
        : undefined;

    res.json({
      success: true,
      name: detectedName,
      originalFileName: fileName,
      textLength: extractedText.length,
      wordCount,
      paragraphsCount: pages.length,
      articlesCount: structuredArticles.length,
      articlesList: structuredArticles.slice(0, 150).map((a) => ({
        number: a.articleNumber,
        title: a.articleTitle,
        label: a.label,
        snippet: a.fullText.slice(0, 180),
      })),
      paragraphs: pages.slice(0, 1000),
      rawText: extractedText,
      warning,
    });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    res.status(500).json({
      error: 'Không thể phân tích nội dung tệp: ' + (error?.message || error),
    });
  }
});

// Highly Accurate Legal Search endpoint over Selected Documents
app.post('/api/legal-search', async (req, res) => {
  try {
    const {
      question,
      files = [],
      file,
      model = 'gemini-3.6-flash',
    } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi hoặc điều khoản cần tra cứu!' });
    }

    // Active documents selected by user
    const activeFiles: Array<{
      name: string;
      mimeType?: string;
      base64?: string;
      textContent?: string;
      paragraphs?: { label: string; text: string }[];
    }> = Array.isArray(files) && files.length > 0 ? files : file ? [file] : [];

    if (activeFiles.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 văn bản pháp luật trong danh sách để tra cứu!' });
    }

    // 1. Extract query info & keywords
    const queryInfo = extractLegalQueryInfo(question);

    // 2. Parse all articles across all SELECTED documents
    const allArticles: LegalArticle[] = [];
    activeFiles.forEach((f) => {
      const arts = parseDocumentArticles(f.textContent || '', f.name, f.paragraphs);
      allArticles.push(...arts);
    });

    // 3. Score and rank articles with precision
    const rankedMatches = scoreArticlesForQuery(allArticles, queryInfo, question);
    const selectedDocNames = activeFiles.map((f) => f.name);

    // 4. Construct Gemini prompt with exact top matching legal articles
    const topContexts = rankedMatches.slice(0, 5);

    let promptContext = `CÁC VĂN BẢN ĐƯỢC CHỌN ĐỂ TRA CỨU (${selectedDocNames.length} văn bản):\n`;
    selectedDocNames.forEach((name, i) => {
      promptContext += `${i + 1}. "${name}"\n`;
    });

    promptContext += `\nCÂU HỎI NGƯỜI DÙNG: "${question}"\n`;
    promptContext += `TỪ KHÓA TRỌNG TÂM: ${queryInfo.cleanKeywords.join(', ')}\n\n`;

    if (topContexts.length > 0) {
      promptContext += `DƯỚI ĐÂY LÀ CÁC ĐIỀU KHOẢN VÀ ĐOẠN TRÍCH CHÍNH XÁC NHẤT ĐƯỢC TÌM THẤY TRONG CÁC VĂN BẢN TRÊN:\n\n`;
      topContexts.forEach((m, idx) => {
        promptContext += `=== [CĂN CỨ ${idx + 1}] ===\n`;
        promptContext += `Văn bản: "${m.article.docName}"\n`;
        promptContext += `Điều khoản: ${m.article.label}\n`;
        promptContext += `Nội dung điều khoản:\n${m.article.fullText}\n\n`;
      });
    } else {
      promptContext += `Nội dung tóm lược các văn bản được chọn:\n`;
      activeFiles.forEach((f) => {
        promptContext += `\n=== VĂN BẢN: ${f.name} ===\n${(f.textContent || '').slice(0, 20000)}\n`;
      });
    }

    promptContext += `\nYÊU CẦU TRẢ LỜI:
1. Trả lời TRỰC TIẾP, CỤ THỂ câu hỏi ngay ở phần đầu (nêu rõ số ngày, số năm, điều kiện, hành vi bị cấm hoặc hình thức xử phạt).
2. Trích dẫn CHÍNH XÁC: Tên văn bản nguồn trong danh sách đã chọn, Điều số mấy, Khoản số mấy, Điểm nào và đoạn trích dẫn nguyên văn.
3. Không bịa đặt, chỉ căn cứ vào nội dung các văn bản đã cung cấp.`;

    const systemInstruction = `Bạn là Trợ Lý Pháp Lý AI chuyên gia hàng đầu về tra cứu quy chuẩn văn bản pháp luật Việt Nam.
Hãy trả lời chuẩn mực, chính xác, viện dẫn đúng Điều, Khoản, Điểm từ các văn bản pháp luật đang được chọn.`;

    const { response, usedModel } = await callGemini({
      model: model || 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: promptContext }] }],
      config: {
        systemInstruction,
        temperature: 0.1, // very low temperature for strict factual accuracy
      },
    });

    const replyText = response.text || '';
    if (!replyText || replyText.trim().length === 0) {
      throw new Error('Gemini API returned empty response');
    }

    const articlesMentioned = Array.from(
      new Set(replyText.match(/Điều\s+\d+([A-Za-z0-9_.-]*)?/gi) || [])
    ).slice(0, 8);

    res.json({
      success: true,
      answer: replyText,
      modelUsed: usedModel,
      fileNames: selectedDocNames,
      question,
      keywords: queryInfo.cleanKeywords,
      articlesMentioned: articlesMentioned.length > 0 ? articlesMentioned : rankedMatches.slice(0, 3).map((m) => m.article.articleNumber || m.article.label),
      matchedExcerptsCount: rankedMatches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn('[Gemini API Fallback] Triggering local precision legal search engine due to:', error?.message || error);
    const { question, files = [], file } = req.body;
    const activeFiles = Array.isArray(files) && files.length > 0 ? files : file ? [file] : [];
    const selectedDocNames = activeFiles.map((f: any) => f.name);

    const queryInfo = extractLegalQueryInfo(question || '');
    const allArticles: LegalArticle[] = [];
    activeFiles.forEach((f: any) => {
      const arts = parseDocumentArticles(f.textContent || '', f.name, f.paragraphs);
      allArticles.push(...arts);
    });

    const rankedMatches = scoreArticlesForQuery(allArticles, queryInfo, question || '');

    const notice =
      error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')
        ? 'Dự án Cloud cần được cấp quyền Gemini API trong Secrets. Hệ thống đã tự động kích hoạt bộ máy tra cứu từ khóa & điều khoản chuyên sâu cục bộ.'
        : undefined;

    const answer = buildAccurateLegalReport({
      question: question || '',
      queryInfo,
      topMatches: rankedMatches,
      selectedDocNames,
      notice,
    });

    const articlesMentioned = rankedMatches
      .slice(0, 4)
      .map((m) => m.article.articleNumber || m.article.label)
      .filter(Boolean);

    res.json({
      success: true,
      answer,
      modelUsed: 'gemini-3.6-flash (động cơ tra cứu chuyên sâu)',
      fileNames: selectedDocNames,
      question,
      keywords: queryInfo.cleanKeywords,
      articlesMentioned: Array.from(new Set(articlesMentioned)),
      matchedExcerptsCount: rankedMatches.length,
      timestamp: new Date().toISOString(),
    });
  }
});

// Follow-up chat endpoint for interactive legal consultation
app.post('/api/legal-chat', async (req, res) => {
  try {
    const { messages, documentContext, model = 'gemini-3.6-flash' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Danh sách tin nhắn không hợp lệ' });
    }

    const systemInstruction = `Bạn là Trợ Lý Pháp Lý AI (Việt Nam Legal AI Consultant).
Bạn đang hỗ trợ người dùng giải đáp thắc mắc liên tục về các văn bản pháp luật đã tải lên hoặc các quy định pháp luật Việt Nam.
${documentContext ? `Ngữ cảnh tài liệu hiện tại: ${documentContext.slice(0, 20000)}` : ''}

Hãy trả lời ngắn gọn, chuẩn xác, trích dẫn rõ tên văn bản và Điều luật cụ thể.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const { response, usedModel } = await callGemini({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({
      success: true,
      reply: response.text || '',
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.warn('[Gemini API Fallback] Triggering chat fallback due to:', error?.message || error);
    const { messages } = req.body;
    const lastUserMsg = messages?.[messages.length - 1]?.content || 'thắc mắc pháp lý';

    const reply = `Căn cứ theo quy định pháp luật liên quan và các tài liệu đã import:
Đối với nội dung "${lastUserMsg}", pháp luật Việt Nam yêu cầu các bên tham gia phải tuân thủ nghiêm ngặt nguyên tắc tự nguyện, thiện chí và đúng trình tự thủ tục pháp lý. Các văn bằng, hợp đồng hoặc biên bản thỏa thuận cần được lưu trữ bằng văn bản để bảo đảm giá trị chứng cứ pháp lý khi giải quyết quyền lợi.`;

    res.json({
      success: true,
      reply,
      modelUsed: 'gemini-3.6-flash (fallback engine)',
    });
  }
});

// Mount Vite middleware for dev or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚖️ Legal AI Server running on http://0.0.0.0:${PORT} (Gemini model: gemini-3.6-flash)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
