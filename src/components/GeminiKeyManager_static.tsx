/**
 * Gemini API key manager for the static build.
 *
 * A static site has no server to hold a secret, so the user supplies their own
 * Gemini key. It is kept in localStorage and sent only to Google's API endpoint.
 * Anything typed into this field is never sent anywhere else.
 */
import React, { useEffect, useState } from 'react';
import { KeyRound, X, Save, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const KEY_STORAGE = 'samho_gemini_api_key';
const DISMISSED = 'samho_gemini_key_banner_dismissed';

export function GeminiKeyManager({ language }: { language?: string }) {
  const isVi = language !== 'en';
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'bad'>('idle');

  useEffect(() => {
    setHasKey(!!localStorage.getItem(KEY_STORAGE));
    // Open automatically the first time if AI is needed and no key exists.
    if (!localStorage.getItem(KEY_STORAGE) && !localStorage.getItem(DISMISSED)) {
      setOpen(true);
    }
  }, []);

  const save = () => {
    const key = value.trim();
    if (!key) return;
    localStorage.setItem(KEY_STORAGE, key);
    localStorage.removeItem(DISMISSED);
    setHasKey(true);
    setValue('');
    setStatus('ok');
    setTimeout(() => setStatus('idle'), 2500);
  };

  const clear = () => {
    localStorage.removeItem(KEY_STORAGE);
    setHasKey(false);
    setStatus('idle');
  };

  const test = async () => {
    const key = localStorage.getItem(KEY_STORAGE);
    if (!key) return;
    setStatus('testing');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
        }
      );
      setStatus(res.ok ? 'ok' : 'bad');
    } catch {
      setStatus('bad');
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={isVi ? 'Cấu hình Gemini API Key' : 'Configure Gemini API key'}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 text-white text-xs font-semibold shadow-lg hover:bg-slate-700 transition"
      >
        <KeyRound className="w-4 h-4" />
        {hasKey ? 'AI ✓' : isVi ? 'Thiết lập AI' : 'Set up AI'}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            {isVi ? 'Cấu hình Gemini API Key' : 'Configure Gemini API Key'}
          </h3>
          <button
            onClick={() => {
              localStorage.setItem(DISMISSED, '1');
              setOpen(false);
            }}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {isVi
              ? 'Bản static không có máy chủ lưu khoá bí mật, nên khoá Gemini của bạn được lưu cục bộ trong trình duyệt này và gửi thẳng tới Google. Không ai khác nhìn thấy, nhưng đừng dùng chung máy tính công cộng.'
              : 'This static build has no server to hold a secret, so your key is stored in this browser and sent directly to Google. Nobody else can see it, but avoid shared/public computers.'}
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder={isVi ? 'Dán API key của bạn' : 'Paste your API key'}
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
            <button
              onClick={save}
              disabled={!value.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isVi ? 'Lưu' : 'Save'}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasKey && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isVi ? 'Đã lưu khoá' : 'Key saved'}
                </span>
                <button
                  onClick={test}
                  disabled={status === 'testing'}
                  className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  {status === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isVi ? 'Kiểm tra' : 'Test'}
                </button>
                <button
                  onClick={clear}
                  className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {isVi ? 'Xoá' : 'Remove'}
                </button>
              </>
            )}
            {status === 'ok' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isVi ? 'Khoá hoạt động' : 'Key works'}
              </span>
            )}
            {status === 'bad' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {isVi ? 'Khoá không hợp lệ' : 'Key rejected'}
              </span>
            )}
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[11px] font-semibold text-blue-600 hover:underline"
          >
            {isVi ? 'Lấy khoá miễn phí tại Google AI Studio →' : 'Get a free key at Google AI Studio →'}
          </a>
        </div>
      </div>
    </div>
  );
}