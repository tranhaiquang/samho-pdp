import React, { useState } from 'react';
import { LevelPolicyData, Language, KpiItem } from '../types';
import { Bot, Send, Sparkles, User, Lightbulb, RefreshCw } from 'lucide-react';

interface AiAdvisorProps {
  data: LevelPolicyData;
  language: Language;
  allKpis: KpiItem[];
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({
  data,
  language,
  allKpis,
}) => {
  const isVi = language === 'vi';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: isVi
        ? `Xin chào! Tôi là Cố vấn AI Hoạch định & Triển khai Chính sách (Hoshin Kanri) cho Vietnam Samho Co. Ltd.
Tôi đã nắm bắt đầy đủ dữ liệu triển khai cấp ${data.level} (Top Level / 2nd / 3rd Level) năm 2026.
Bạn có thể hỏi tôi về phân tích chênh lệch chỉ số KPI (DPPM, PPH, Miniline, QCO, Lead time...), nguyên nhân gốc rễ (5-Why) và đề xuất kế hoạch hành động 8D!`
        : `Hello! I am your AI Policy Deployment (Hoshin Kanri) Advisor for Vietnam Samho Co. Ltd.
I have full context on the 2026 ${data.level} deployment dataset. Ask me anything regarding KPI performance, 5-Why root cause analysis, or 8D corrective actions!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = isVi
    ? [
        'Phân tích nguyên nhân DPPM tăng cao (28k PPM) và đề xuất giải pháp 8D khẩn cấp.',
        'Đánh giá tiến độ triển khai Miniline (21%) và lộ trình Cắt tự động (Autocut 80%).',
        'Tổng hợp báo cáo nhanh tình hình triển khai chính sách Tháng 5/2026 cho Ban Giám Đốc.',
        'Đề xuất Kaizen cải tiến QCO, Andon và bảo trì TPM xưởng sản xuất.',
      ]
    : [
        'Analyze DPPM spike (28k PPM) and suggest 8D corrective actions.',
        'Evaluate Miniline 21% progress and Autocut roadmap (80% by Dec).',
        'Summarize May 2026 Policy Deployment status for Executive Board.',
        'Suggest Kaizen ideas for QCO, Andon, and TPM equipment maintenance.',
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setLoading(true);

    try {
      // Find a representative KPI or pass overview
      const sampleKpi = allKpis.find((k) => k.code === 'L1 1.5.1') || allKpis[0];

      const res = await fetch('/api/analyze-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpi: {
            ...sampleKpi,
            problemDescription: `User Query Context: ${text}`,
          },
          level: data.level,
          language,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'AI query failed');

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: resData.analysis,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: isVi
            ? `⚠️ Lỗi kết nối Cố vấn AI: ${err.message}`
            : `⚠️ AI Advisor Error: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-[75vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <span>
                {isVi
                  ? 'Cố Vấn AI Policy Deployment (Hoshin Kanri)'
                  : 'AI Strategic Policy Advisor'}
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-purple-200">
              Vietnam Samho Co. Ltd • Powered by Gemini AI
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Prompts Bar */}
      <div className="bg-purple-50/60 border-b border-purple-100 p-3 overflow-x-auto flex items-center space-x-2 text-xs">
        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-semibold text-purple-900 shrink-0">
          {isVi ? 'Gợi ý câu hỏi:' : 'Suggested:'}
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="px-3 py-1 rounded-full bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 whitespace-nowrap transition shadow-2xs font-medium"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2 ${
              m.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.sender === 'ai' && (
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl p-4 text-xs shadow-xs ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none whitespace-pre-line leading-relaxed'
              }`}
            >
              <div className="font-bold mb-1 opacity-80 flex items-center justify-between gap-4">
                <span>
                  {m.sender === 'user'
                    ? isVi
                      ? 'Bạn'
                      : 'You'
                    : isVi
                    ? 'Cố Vấn AI Vietnam Samho'
                    : 'AI Advisor'}
                </span>
                <span className="text-[10px] font-normal">{m.time}</span>
              </div>
              <div>{m.text}</div>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-purple-700 bg-purple-50 p-3 rounded-xl border border-purple-100 w-fit">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
            <span>
              {isVi
                ? 'Cố vấn AI đang phân tích dữ liệu nhà máy Vietnam Samho...'
                : 'AI Advisor is analyzing Vietnam Samho factory dataset...'}
            </span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={
            isVi
              ? 'Nhập câu hỏi về tình hình triển khai chính sách 2026...'
              : 'Ask a question about Vietnam Samho Policy Deployment...'
          }
          className="flex-1 px-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputQuery.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition shadow-sm disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{isVi ? 'Gửi' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
};
