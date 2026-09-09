'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, Check, Copy, RotateCcw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toHiragana } from '@/lib/hiragana';
import { kanjiMap, type KanjiEntry } from '@/lib/kanji-data';

type NameOption = { value: string; parts: string[]; score: number };

function scoreName(parts: string[]) {
  const value = parts.join('');
  let score = 30 - Math.abs(value.length - 4) * 4;
  if (value.length >= 3 && value.length <= 5) score += 7;
  if (parts.some((part, index) => index > 0 && parts[index - 1] === part)) score -= 14;
  parts.slice(1).forEach((part, index) => {
    if (parts[index].at(-1) === part.at(0)) score -= 5;
  });
  if (/(시|키|토|루|미|라|로|히|코|마|야)$/.test(value)) score += 3;
  if (/^(토모|아키|하루|히로|유키|마사)/.test(value)) score += 2;
  return score;
}

function makeOptions(entries: KanjiEntry[]): NameOption[] {
  return entries
    .reduce<string[][]>((all, entry) => all.flatMap((parts) => entry.readings.map((reading) => [...parts, reading])), [[]])
    .map((parts) => ({ value: parts.join(''), parts, score: scoreName(parts) }))
    .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value, 'ko'));
}

export default function Home() {
  const [surname, setSurname] = useState('김');
  const [givenKanji, setGivenKanji] = useState('智敏');
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
  const characters = Array.from(givenKanji.replace(/\s/g, ''));
  const matches = characters.map((character) => kanjiMap.get(character));
  const missing = characters.filter((_, index) => !matches[index]);
  const entries = matches.filter((entry): entry is KanjiEntry => Boolean(entry));
  const options = useMemo(
    () => characters.length > 0 && missing.length === 0 ? makeOptions(entries) : [],
    [givenKanji],
  );
  const choice = options[Math.min(selected, Math.max(0, options.length - 1))];

  useEffect(() => {
    const context = (document as Document & {
      modelContext?: {
        registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'find_japanese_name',
      title: '일본식 이름 찾기',
      description: '한국 성은 유지하고 이름 한자의 일본식 읽기를 조합해 추천 이름을 화면에 표시합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          surname: { type: 'string', description: '그대로 유지할 한국 성' },
          givenKanji: { type: 'string', minLength: 1, maxLength: 3, description: '읽기를 찾을 이름 한자 1~3자' },
        },
        required: ['surname', 'givenKanji'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { surname?: unknown; givenKanji?: unknown };
        if (typeof value.surname !== 'string' || typeof value.givenKanji !== 'string') {
          throw new Error('성과 이름 한자를 문자열로 입력해 주세요.');
        }
        const chars = Array.from(value.givenKanji.replace(/\s/g, ''));
        if (chars.length < 1 || chars.length > 3 || chars.some((char) => !kanjiMap.has(char))) {
          throw new Error('표에 수록된 이름 한자 1~3자를 입력해 주세요.');
        }
        const found = chars.map((char) => kanjiMap.get(char) as KanjiEntry);
        const recommended = makeOptions(found)[0];
        setSurname(value.surname.slice(0, 6));
        setGivenKanji(chars.join(''));
        setSelected(0);
        setCopied(false);
        return {
          fullName: value.surname.slice(0, 6) + recommended.value,
          reading: recommended.value,
          parts: found.map((entry, index) => ({ kanji: entry.kanji, reading: recommended.parts[index] })),
        };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function updateKanji(value: string) {
    setGivenKanji(value.replace(/[^\u3400-\u9fff\uf900-\ufaff\s]/g, '').slice(0, 3));
    setSelected(0);
    setCopied(false);
  }

  async function copyResult() {
    if (!choice) return;
    await navigator.clipboard.writeText((surname + choice.value).trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="나마에 홈">
            <span className="seal">名</span>
            <span className="font-serif text-xl font-bold tracking-[-0.03em]">나마에</span>
          </a>
          <span className="text-xs font-semibold tracking-[0.14em] text-ink/45">KANJI NAME FINDER</span>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 md:py-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10">
        <div className="flex flex-col justify-center">
          <Badge variant="outline" className="mb-5 h-7 border-vermilion/25 bg-vermilion/5 px-3 text-vermilion">
            <Sparkles data-icon="inline-start" /> 한자 그대로, 일본식 이름으로
          </Badge>
          <h1 className="font-serif text-[clamp(2.5rem,6vw,5.2rem)] font-bold leading-[1.02] tracking-[-0.055em] text-ink">
            내 이름에 숨은<br />일본식 읽기를 찾아요.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink/60 md:text-base">
            성은 그대로 두고, 이름 한자마다 표에 수록된 일본식 인명 읽기를 이어 붙여 자연스러운 조합을 추천합니다.
          </p>

          <div className="mt-8 rounded-[24px] border border-ink/10 bg-white/75 p-5 shadow-[0_20px_70px_rgba(37,42,49,0.08)] md:p-6">
            <div className="grid gap-4 sm:grid-cols-[0.42fr_1fr]">
              <label className="input-label">
                <span>성 <small>그대로 유지</small></span>
                <Input value={surname} onChange={(event) => setSurname(event.target.value.slice(0, 6))} className="name-input" placeholder="김" />
              </label>
              <label className="input-label">
                <span>이름 한자 <small>1–3자</small></span>
                <Input value={givenKanji} onChange={(event) => updateKanji(event.target.value)} className="name-input font-serif" placeholder="예: 智敏" autoComplete="off" />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/8 pt-4 text-xs text-ink/45">
              <span>표 데이터 {kanjiMap.size}자 수록</span>
              <button type="button" onClick={() => { setSurname('김'); updateKanji('智敏'); }} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold hover:bg-ink/5 hover:text-ink">
                <RotateCcw className="size-3.5" /> 예시 다시 보기
              </button>
            </div>
          </div>
        </div>

        <section className="result-panel" aria-live="polite">
          <div className="flex items-center justify-between">
            <div><p className="eyebrow">YOUR JAPANESE NAME</p><h2 className="mt-1 font-serif text-lg font-bold">추천 이름</h2></div>
            <span className="brush-circle" aria-hidden="true">和</span>
          </div>

          {characters.length === 0 ? (
            <div className="empty-state"><BookOpenText /><p>이름 한자를 입력하면<br />읽기를 찾아드려요.</p></div>
          ) : missing.length > 0 ? (
            <div className="empty-state error"><BookOpenText /><p><strong>{missing.join(', ')}</strong>은(는) 표에서 찾지 못했어요.<br /><span>다른 한자를 입력해 보세요.</span></p></div>
          ) : choice ? (
            <>
              <div className="mt-8">
                <p className="text-sm font-semibold text-ink/45">{surname} {givenKanji}</p>
                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <strong className="font-serif text-[clamp(2.6rem,7vw,5.4rem)] leading-none tracking-[-0.055em] text-ink">{surname}{choice.value}</strong>
                  <Badge className="mb-1.5 bg-vermilion text-white">추천</Badge>
                </div>
                <div className="furigana-preview" aria-label={'히라가나 표기 ' + choice.parts.map(toHiragana).join('')}>
                  <span>{surname}</span>
                  {choice.parts.map((part, index) => (
                    <ruby key={part + index}>
                      {part}
                      <rt>{toHiragana(part)}</rt>
                    </ruby>
                  ))}
                </div>
              </div>

              <div className="my-7 flex flex-wrap items-center gap-2" aria-label="한자별 읽기">
                {entries.map((entry, index) => (
                  <div key={entry.kanji + index} className="contents">
                    {index > 0 && <ArrowRight className="size-4 text-ink/25" />}
                    <span className="reading-chip"><b className="font-serif">{entry.kanji}</b><span>{choice.parts[index]}</span></span>
                  </div>
                ))}
              </div>

              <div className="border-t border-ink/10 pt-5">
                <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">다른 읽기</h3><span className="text-xs text-ink/40">자연스러운 순</span></div>
                <div className="flex flex-wrap gap-2">
                  {options.slice(0, 8).map((option, index) => (
                    <button key={option.value} type="button" onClick={() => { setSelected(index); setCopied(false); }} className={'option-pill ' + (index === selected ? 'active' : '')}>
                      {index === selected && <Check className="size-3.5" />}{option.value}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={copyResult} className="mt-7 h-12 w-full rounded-xl bg-ink text-base text-paper hover:bg-ink/90">
                {copied ? <><Check /> 복사했어요</> : <><Copy /> 이름 복사하기</>}
              </Button>
            </>
          ) : null}
        </section>
      </section>

      <section className="border-t border-ink/8 bg-white/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-9 md:grid-cols-3 md:px-8">
          {[
            ['01', '성은 그대로', '입력한 성은 바꾸지 않고 결과 앞에 그대로 붙여요.'],
            ['02', '한자별 읽기 탐색', 'kanji1·2·3 표에서 이름 한자를 하나씩 찾아요.'],
            ['03', '자연스러운 조합', '가능한 읽기를 모두 조합해 부르기 편한 순으로 보여줘요.'],
          ].map(([number, title, copy]) => (
            <article key={number} className="step-card"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs leading-5 text-ink/40 md:flex-row md:items-center md:justify-between md:px-8">
        <p>원본 표의 일본식 읽기를 기반으로 한 참고용 결과예요.</p>
        <p>같은 한자도 실제 이름에서는 다르게 읽을 수 있습니다.</p>
      </footer>
    </main>
  );
}
