import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, Globe } from 'lucide-react';
import { syncService } from '../lib/syncService';
import { Language } from '../types';

interface TrilingualInputGroupProps {
  label: string;
  valueEn: string;
  valueVi: string;
  valueKo: string;
  onChangeEn: (val: string) => void;
  onChangeVi: (val: string) => void;
  onChangeKo: (val: string) => void;
  context?: 'kpi' | 'objective' | 'priority';
  isMultiline?: boolean;
  required?: boolean;
  language?: Language;
  placeholderEn?: string;
  placeholderVi?: string;
  placeholderKo?: string;
}

export const TrilingualInputGroup: React.FC<TrilingualInputGroupProps> = ({
  label,
  valueEn,
  valueVi,
  valueKo,
  onChangeEn,
  onChangeVi,
  onChangeKo,
  context = 'kpi',
  isMultiline = false,
  required = false,
  language = 'vi',
  placeholderEn = 'e.g. Enter title in English...',
  placeholderVi = 'e.g. Nhập tên bằng tiếng Việt...',
  placeholderKo = 'e.g. 한국어로 입력하세요...',
}) => {
  const isVi = language === 'vi';
  const isKo = language === 'ko';

  const [activeSource, setActiveSource] = useState<'en' | 'vi' | 'ko' | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastTranslatedSource, setLastTranslatedSource] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performTranslation = async (text: string, fromLang: 'en' | 'vi' | 'ko') => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (trimmed === lastTranslatedSource) return;

    setIsTranslating(true);
    try {
      const res = await syncService.translateSingle(trimmed, fromLang, context);
      setLastTranslatedSource(trimmed);

      if (fromLang === 'en') {
        if (res.textVi) onChangeVi(res.textVi);
        if (res.textKo) onChangeKo(res.textKo);
      } else if (fromLang === 'vi') {
        if (res.textEn) onChangeEn(res.textEn);
        if (res.textKo) onChangeKo(res.textKo);
      } else if (fromLang === 'ko') {
        if (res.textEn) onChangeEn(res.textEn);
        if (res.textVi) onChangeVi(res.textVi);
      }
    } catch (err) {
      console.warn('[TrilingualInputGroup] Auto-translate error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleEnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChangeEn(val);
    setActiveSource('en');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performTranslation(val, 'en');
    }, 650);
  };

  const handleViChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChangeVi(val);
    setActiveSource('vi');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performTranslation(val, 'vi');
    }, 650);
  };

  const handleKoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChangeKo(val);
    setActiveSource('ko');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performTranslation(val, 'ko');
    }, 650);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
          <Globe className="w-4 h-4 text-blue-600" />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          {isTranslating ? (
            <span className="flex items-center space-x-1 text-emerald-600 font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {isVi ? 'Đang tự động dịch...' : isKo ? '자동 번역 생성 중...' : 'Auto-translating...'}
              </span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-slate-500">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">
                {isVi
                  ? 'Nhập 1 ngôn ngữ, 2 ngôn ngữ còn lại tự động tạo'
                  : isKo
                  ? '한 언어만 입력해도 나머지 언어가 자동 번역됩니다'
                  : 'Type in any language, others auto-fill'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Inputs grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* English Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <span>🇺🇸</span>
              <span>{isVi ? 'Tiếng Anh (English)' : 'English'}</span>
            </span>
            <button
              type="button"
              onClick={() => performTranslation(valueEn, 'en')}
              disabled={!valueEn.trim() || isTranslating}
              title={isVi ? 'Dịch sang tiếng Việt & tiếng Hàn' : 'Translate to VI & KO'}
              className="text-[10px] text-blue-600 hover:text-blue-800 disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{isVi ? 'Dịch AI' : 'AI Translate'}</span>
            </button>
          </div>
          {isMultiline ? (
            <textarea
              value={valueEn}
              onChange={handleEnChange}
              onBlur={() => valueEn && performTranslation(valueEn, 'en')}
              rows={2}
              placeholder={placeholderEn}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
            />
          ) : (
            <input
              type="text"
              value={valueEn}
              onChange={handleEnChange}
              onBlur={() => valueEn && performTranslation(valueEn, 'en')}
              placeholder={placeholderEn}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
            />
          )}
        </div>

        {/* Vietnamese Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <span>🇻🇳</span>
              <span>{isVi ? 'Tiếng Việt' : 'Vietnamese'}</span>
            </span>
            <button
              type="button"
              onClick={() => performTranslation(valueVi, 'vi')}
              disabled={!valueVi.trim() || isTranslating}
              title={isVi ? 'Dịch sang tiếng Anh & tiếng Hàn' : 'Translate to EN & KO'}
              className="text-[10px] text-emerald-600 hover:text-emerald-800 disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{isVi ? 'Dịch AI' : 'AI Translate'}</span>
            </button>
          </div>
          {isMultiline ? (
            <textarea
              value={valueVi}
              onChange={handleViChange}
              onBlur={() => valueVi && performTranslation(valueVi, 'vi')}
              rows={2}
              placeholder={placeholderVi}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          ) : (
            <input
              type="text"
              value={valueVi}
              onChange={handleViChange}
              onBlur={() => valueVi && performTranslation(valueVi, 'vi')}
              placeholder={placeholderVi}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          )}
        </div>

        {/* Korean Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <span>🇰🇷</span>
              <span>{isVi ? 'Tiếng Hàn (한국어)' : 'Korean'}</span>
            </span>
            <button
              type="button"
              onClick={() => performTranslation(valueKo, 'ko')}
              disabled={!valueKo.trim() || isTranslating}
              title={isVi ? 'Dịch sang tiếng Anh & tiếng Việt' : 'Translate to EN & VI'}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{isVi ? 'Dịch AI' : 'AI Translate'}</span>
            </button>
          </div>
          {isMultiline ? (
            <textarea
              value={valueKo}
              onChange={handleKoChange}
              onBlur={() => valueKo && performTranslation(valueKo, 'ko')}
              rows={2}
              placeholder={placeholderKo}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          ) : (
            <input
              type="text"
              value={valueKo}
              onChange={handleKoChange}
              onBlur={() => valueKo && performTranslation(valueKo, 'ko')}
              placeholder={placeholderKo}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
