import type React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ScanText } from 'lucide-react';
import { voiceGuidelines } from '../data';

type Props = {
  body: string;
};

function words(text: string) {
  return text.trim().match(/[A-Za-z0-9'’-]+/g) ?? [];
}

function countSyllables(word: string) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  const groups = clean.replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

export function fleschKincaidGrade(text: string) {
  const wordList = words(text);
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
  const syllables = wordList.reduce((sum, word) => sum + countSyllables(word), 0);
  if (!wordList.length) return 0;
  return 0.39 * (wordList.length / sentences) + 11.8 * (syllables / wordList.length) - 15.59;
}

export default function OutreachMetrics({ body }: Props) {
  const wordCount = words(body).length;
  const grade = fleschKincaidGrade(body);
  const questionCount = (body.match(/\?/g) ?? []).length;
  const banned = voiceGuidelines.bannedWords.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(body));
  const wordOk = wordCount >= 60 && wordCount <= 90;
  const questionOk = questionCount <= 2;
  const bannedOk = banned.length === 0;

  const metric = (ok: boolean, label: string, value: string, icon: React.ReactNode) => (
    <div className={`rounded-2xl border p-3 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{label}</div>
      <div className="mt-1 text-xs text-slate-600">{value}</div>
    </div>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metric(wordOk, '60–90 words', `${wordCount} words`, wordOk ? <CheckCircle2 size={16} /> : <ScanText size={16} />)}
      {metric(grade <= 9, 'Reading grade', `${grade.toFixed(1)} Flesch-Kincaid`, <ScanText size={16} />)}
      {metric(questionOk, 'Question count', `${questionCount} question${questionCount === 1 ? '' : 's'}`, <HelpCircle size={16} />)}
      {metric(bannedOk, 'Banned words', bannedOk ? 'No banned words found' : banned.join(', '), bannedOk ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />)}
    </div>
  );
}
