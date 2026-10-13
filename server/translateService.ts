import { GoogleGenAI } from '@google/genai';

export interface TranslateItemInput {
  id: string;
  textEn: string;
  context?: 'kpi' | 'objective' | 'priority';
}

export interface TranslateItemResult {
  id: string;
  textEn: string;
  textVi: string;
  textKo: string;
}

// Built-in industrial dictionary for Footwear, Lean Manufacturing, and Hoshin Kanri
const LEAN_DICTIONARY: Record<string, { vi: string; ko: string }> = {
  'pph': { vi: 'Năng suất đôi/giờ (PPH)', ko: '시간당 생산량 (PPH)' },
  'product per hour': { vi: 'Năng suất đôi/giờ công', ko: '시간당 생산량' },
  'pair per hour': { vi: 'Năng suất đôi/giờ', ko: '시간당 생산 족수' },
  'miniline': { vi: 'Chuyền nhỏ (Miniline)', ko: '미니라인' },
  'mini line': { vi: 'Chuyền nhỏ (Mini line)', ko: '미니라인' },
  'lean assessment': { vi: 'Đánh giá năng lực Lean', ko: '린(Lean) 평가' },
  'c2b lines': { vi: 'Chuyền C2B', ko: 'C2B 라인' },
  'downtime': { vi: 'Thời gian dừng máy', ko: '비가동 시간' },
  'scrap rate': { vi: 'Tỷ lệ phế phẩm', ko: '불량률 (폐기율)' },
  'scrap': { vi: 'Phế phẩm', ko: '폐기물/불량' },
  'rework': { vi: 'Tỷ lệ làm lại', ko: '재작업률' },
  'oee': { vi: 'Hiệu suất thiết bị tổng thể (OEE)', ko: '종합설비효율 (OEE)' },
  'absenteeism': { vi: 'Tỷ lệ vắng mặt', ko: '결근율' },
  'absenteeism rate': { vi: 'Tỷ lệ vắng mặt', ko: '결근율' },
  'turnover rate': { vi: 'Tỷ lệ thôi việc / nghỉ việc', ko: '이직률' },
  'labor turnover': { vi: 'Biến động lao động', ko: '이직률' },
  'on-time delivery': { vi: 'Giao hàng đúng hạn (OTD)', ko: '정시 납기율 (OTD)' },
  'otd': { vi: 'Tỷ lệ giao hàng đúng hạn', ko: '정시 납기율' },
  'lead time': { vi: 'Thời gian sản xuất / Chu kỳ', ko: '리드 타임' },
  'cycle time': { vi: 'Thời gian chu kỳ', ko: '사이클 타임' },
  'takt time': { vi: 'Nhịp sản xuất (Takt time)', ko: '택트 타임' },
  'first pass yield': { vi: 'Tỷ lệ đạt ngay lần đầu (FPY)', ko: '직행률 (FPY)' },
  'fpy': { vi: 'Tỷ lệ đạt lần đầu (FPY)', ko: '직행률 (FPY)' },
  'energy consumption': { vi: 'Tiêu thụ năng lượng', ko: '에너지 소비량' },
  'safety accident': { vi: 'Tai nạn lao động', ko: '안전사고 건수' },
  'zero accident': { vi: 'Không tai nạn lao động', ko: '무재해 달성' },
  'customer complaint': { vi: 'Khiếu nại khách hàng', ko: '고객 클레임 건수' },
  '5s audit': { vi: 'Đánh giá 5S', ko: '5S 심사' },
  '5s audit score': { vi: 'Điểm đánh giá 5S', ko: '5S 심사 점수' },
  'kaizen': { vi: 'Sáng kiến Kaizen', ko: '카이젠(개선) 제안' },
  'kaizen suggestions': { vi: 'Số sáng kiến Kaizen', ko: '카이젠 제안 건수' },
  'cost saving': { vi: 'Tiết kiệm chi phí', ko: '원가 절감' },
  'line balancing': { vi: 'Cân bằng chuyền', ko: '라인 밸런싱 효율' },
  'utilize the existing facility': { vi: 'Tối ưu hóa cơ sở vật chất hiện hữu', ko: '기존 시설 활용 극대화' },
  'capacity expansion': { vi: 'Mở rộng công suất sản xuất', ko: '생산 능력(케파) 확장' },
  'best partnership factory': { vi: 'Nhà máy đối tác tốt nhất', ko: '최우수 파트너 공장 달성' },
  'breakthrough objectives': { vi: 'Mục tiêu đột phá', ko: '혁신 돌파 목표' },
  'annual objectives': { vi: 'Mục tiêu hàng năm', ko: '연간 핵심 목표' },
  'improvement priorities': { vi: 'Ưu tiên cải tiến', ko: '중점 개선 과제' },
  'production plan execution rate': { vi: 'Tỷ lệ thực hiện kế hoạch sản xuất', ko: '생산 계획 달성률' },
  'plan execution rate': { vi: 'Tỷ lệ thực hiện kế hoạch', ko: '계획 달성률' },
  'output': { vi: 'Sản lượng', ko: '생산량' },
  'efficiency': { vi: 'Hiệu suất', ko: '효율성' },
  'productivity': { vi: 'Năng suất', ko: '생산성' },
  'defect rate': { vi: 'Tỷ lệ lỗi', ko: '불량률' },
  'inventory': { vi: 'Tồn kho', ko: '재고' },
  'wip': { vi: 'Bán thành phẩm trên chuyền (WIP)', ko: '공정 재고 (WIP)' },
  'preventive maintenance': { vi: 'Bảo trì phòng ngừa', ko: '예방 보전' },
  'quality pass rate': { vi: 'Tỷ lệ đạt chất lượng', ko: '품질 합격률' },
};

function lookupDictionary(text: string): { vi: string; ko: string } | null {
  const clean = text.trim().toLowerCase();
  if (LEAN_DICTIONARY[clean]) {
    return LEAN_DICTIONARY[clean];
  }
  for (const [k, v] of Object.entries(LEAN_DICTIONARY)) {
    if (clean.includes(k)) {
      return v;
    }
  }
  return null;
}

export async function translateBatchService(
  items: TranslateItemInput[]
): Promise<TranslateItemResult[]> {
  if (!items || items.length === 0) return [];

  const results: TranslateItemResult[] = [];
  const itemsNeedingAi: TranslateItemInput[] = [];

  // 1. Check dictionary first
  for (const item of items) {
    const text = item.textEn.trim();
    if (!text) {
      results.push({ id: item.id, textEn: '', textVi: '', textKo: '' });
      continue;
    }

    const dict = lookupDictionary(text);
    if (dict && text.length < 40) {
      results.push({
        id: item.id,
        textEn: text,
        textVi: dict.vi,
        textKo: dict.ko,
      });
    } else {
      itemsNeedingAi.push(item);
    }
  }

  // 2. If all were in dictionary, return early
  if (itemsNeedingAi.length === 0) {
    return results;
  }

  // 3. Translate remaining with Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are a professional industrial translator for Vietnam Samho Co. Ltd (Korean-owned footwear manufacturing company in Vietnam producing for New Balance).
Translate each English text into natural industrial Vietnamese (tiếng Việt chuẩn nhà máy sản xuất giày/Lean) AND Korean (한국어 표준 제조업/린 경영 용어).

Input items JSON:
${JSON.stringify(
  itemsNeedingAi.map((i) => ({ id: i.id, text: i.textEn, context: i.context || 'kpi' }))
)}

Respond ONLY with a valid JSON array containing exact schema:
[
  {
    "id": "item-id",
    "textEn": "original english",
    "textVi": "vietnamese translation",
    "textKo": "korean translation"
  }
]
No markdown, no backticks if possible, just valid JSON.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed: Array<{ id: string; textEn: string; textVi: string; textKo: string }> =
        JSON.parse(cleanJson);

      const map = new Map<string, { textVi: string; textKo: string }>();
      parsed.forEach((p) => {
        map.set(p.id, { textVi: p.textVi, textKo: p.textKo });
      });

      for (const item of itemsNeedingAi) {
        const found = map.get(item.id);
        if (found) {
          results.push({
            id: item.id,
            textEn: item.textEn,
            textVi: found.textVi || item.textEn,
            textKo: found.textKo || item.textEn,
          });
        } else {
          // fallback
          const dict = lookupDictionary(item.textEn);
          results.push({
            id: item.id,
            textEn: item.textEn,
            textVi: dict ? dict.vi : item.textEn,
            textKo: dict ? dict.ko : item.textEn,
          });
        }
      }

      return results;
    } catch (err) {
      console.warn('[TranslateService] Gemini API call error or fallback:', err);
    }
  }

  // Fallback if no Gemini API key or error
  for (const item of itemsNeedingAi) {
    const dict = lookupDictionary(item.textEn);
    results.push({
      id: item.id,
      textEn: item.textEn,
      textVi: dict ? dict.vi : `${item.textEn}`,
      textKo: dict ? dict.ko : `${item.textEn}`,
    });
  }

  return results;
}

export interface TranslateUniversalInput {
  text: string;
  fromLang?: 'en' | 'vi' | 'ko' | 'auto';
  context?: string;
}

export interface TranslateUniversalResult {
  textEn: string;
  textVi: string;
  textKo: string;
}

export async function translateSingleUniversal(
  input: TranslateUniversalInput
): Promise<TranslateUniversalResult> {
  const raw = (input.text || '').trim();
  if (!raw) {
    return { textEn: '', textVi: '', textKo: '' };
  }

  const from = input.fromLang || 'auto';

  // 1. Dictionary lookup (En, Vi, Ko)
  const lower = raw.toLowerCase();
  for (const [enKey, val] of Object.entries(LEAN_DICTIONARY)) {
    if (lower === enKey || (lower.length > 3 && enKey.includes(lower))) {
      return {
        textEn: enKey.charAt(0).toUpperCase() + enKey.slice(1),
        textVi: val.vi,
        textKo: val.ko,
      };
    }
    if (val.vi.toLowerCase() === lower || (lower.length > 4 && val.vi.toLowerCase().includes(lower))) {
      return {
        textEn: enKey.charAt(0).toUpperCase() + enKey.slice(1),
        textVi: raw,
        textKo: val.ko,
      };
    }
    if (val.ko.toLowerCase() === lower || (lower.length > 3 && val.ko.toLowerCase().includes(lower))) {
      return {
        textEn: enKey.charAt(0).toUpperCase() + enKey.slice(1),
        textVi: val.vi,
        textKo: raw,
      };
    }
  }

  // 2. Gemini AI trilingual translation
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are an expert trilingual industrial translator for Vietnam Samho Co. Ltd (Korean-invested footwear factory in Vietnam manufacturing for New Balance).
Translate the following input text into English, Vietnamese (Lean footwear manufacturing standard), and Korean (제조업 표준 용어).
Input text: "${raw}"
Source language hint: ${from}
Context: ${input.context || 'Hoshin Kanri Policy Deployment / KPI / Objective'}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "textEn": "english translation",
  "textVi": "vietnamese translation",
  "textKo": "korean translation"
}
`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanJson);
      return {
        textEn: parsed.textEn || raw,
        textVi: parsed.textVi || raw,
        textKo: parsed.textKo || raw,
      };
    } catch (err) {
      console.warn('[TranslateUniversal] Gemini translation error or fallback:', err);
    }
  }

  // Fallback
  return {
    textEn: raw,
    textVi: raw,
    textKo: raw,
  };
}

