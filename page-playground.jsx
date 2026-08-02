// SENA — Playground: tabbed (Pronunciation + AI Free-Talking)
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP, useMemo: useMemoP } = React;

// ===== shared helpers =====
function makeWave(seed, n = 80, base = 0.5) {
  const out = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const env = Math.sin((i / n) * Math.PI);
    const v = base + (r - 0.5) * 0.6 + Math.sin(i * 0.4) * 0.15;
    out.push(Math.max(0.06, Math.min(1, v * (0.4 + env * 0.9))));
  }
  return out;
}
function fmt(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}


// ===== useServerStatus hook =====
function useServerStatus(tick) {
  const [status, setStatus] = useStateP("checking");
  useEffectP(() => {
    let cancelled = false;
    setStatus("checking");
    async function check() {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        const r = await fetch(window.SENA_CONFIG.backendUrl + "/health", { signal: ctrl.signal });
        clearTimeout(timer);
        if (!cancelled) setStatus(r.ok ? "online" : "offline");
      } catch {
        clearTimeout(timer);
        if (!cancelled) setStatus("offline");
      }
    }
    check();
    const id = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tick]);
  return status;
}

// ===== BackendStatusBadge =====
function BackendStatusBadge({ lang, status, onConfigClick }) {
  const ko = lang === "ko";
  const dot   = status === "online" ? "#10B981" : status === "offline" ? "#EF4444" : "#F59E0B";
  const label = status === "online"
    ? (ko ? "서버 연결됨" : "Server online")
    : status === "offline"
    ? (ko ? "서버 연결 안 됨" : "Server offline")
    : (ko ? "연결 확인 중…" : "Checking…");

  const savedUrl = window.SENA_API.getBackendUrl();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12,
                  color: "var(--fg-faint)", marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot,
                     boxShadow: `0 0 6px ${dot}`, display: "inline-block", flexShrink: 0 }} />
      <span>{label}</span>
      {savedUrl && (
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5,
                       opacity: 0.55, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {savedUrl}
        </span>
      )}
      <button onClick={onConfigClick} style={{
        marginLeft: 4, padding: "2px 10px", fontSize: 11, borderRadius: 4,
        border: "1px solid var(--border)", background: "var(--surface)",
        color: "var(--fg-faint)", cursor: "pointer", lineHeight: 1.6,
      }}>
        {ko ? "주소 설정" : "Set URL"}
      </button>
    </div>
  );
}

// ===== BackendUrlModal =====
function BackendUrlModal({ lang, onClose, onSave }) {
  const ko = lang === "ko";
  const [url, setUrl] = useStateP(() => window.SENA_API.getBackendUrl() || "");
  const [copied, setCopied] = useStateP(false);

  const trimmed = url.trim().replace(/\/$/, "");
  const shareLink = trimmed
    ? `${location.origin}${location.pathname}?api=${encodeURIComponent(trimmed)}`
    : "";

  function save() {
    window.SENA_API.setBackendUrl(url);
    onSave();
    onClose();
  }
  function clear() {
    window.SENA_API.setBackendUrl("");
    setUrl("");
    onSave();
    onClose();
  }
  function copyLink() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="report-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="url-modal">
        <div className="url-modal-head">
          <span className="url-modal-title">{ko ? "백엔드 서버 주소 설정" : "Set Backend URL"}</span>
          <button className="report-close-btn" onClick={onClose}>✕</button>
        </div>
        <p className="url-modal-desc">
          {ko
            ? "start.bat 실행 후 터미널에 표시된 Cloudflare 주소를 입력하세요."
            : "Enter the Cloudflare URL shown in the terminal after running start.bat."}
        </p>
        <input
          className="url-modal-input"
          type="url"
          placeholder="https://xxxx.trycloudflare.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); }}
          autoFocus
        />

        {shareLink && (
          <div className="url-share-block">
            <div className="url-share-label">
              {ko ? "공유 링크 — 이 링크를 보내면 상대방도 자동으로 연결됩니다" : "Shareable link — others open this and connect automatically"}
            </div>
            <div className="url-share-row">
              <span className="url-share-text">{shareLink}</span>
              <button className="url-copy-btn" onClick={copyLink}>
                {copied ? (ko ? "복사됨!" : "Copied!") : (ko ? "복사" : "Copy")}
              </button>
            </div>
          </div>
        )}

        <div className="url-modal-foot">
          <button className="btn-ghost" onClick={clear}>{ko ? "초기화" : "Clear"}</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={onClose}>{ko ? "취소" : "Cancel"}</button>
            <button className="url-save-btn" onClick={save}>{ko ? "저장" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== ReportModal =====
function ReportModal({ report, lang, sessionId, onClose }) {
  const ko = lang === "ko";
  const [tab, setTab] = useStateP("overall");

  const tabs = [
    { key: "overall",    label: ko ? "총평"   : "Summary"  },
    { key: "grammar",    label: ko ? "문법"   : "Grammar"  },
    { key: "vocabulary", label: ko ? "어휘"   : "Vocabulary" },
    { key: "fluency",    label: ko ? "유창성" : "Fluency"  },
  ];

  async function downloadWord() {
    try { await window.SENA_API.downloadReport(sessionId, lang); }
    catch (e) { alert(e.message); }
  }

  return (
    <div className="report-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-modal">
        <div className="report-modal-head">
          <span className="report-title">{ko ? "세션 리포트" : "Session Report"}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="word-btn" onClick={downloadWord}>{ko ? "Word 다운로드" : "Download Word"}</button>
            <button className="report-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="report-tabs">
          {tabs.map(tb => (
            <button key={tb.key} className={`report-tab ${tab === tb.key ? "active" : ""}`}
              onClick={() => setTab(tb.key)}>{tb.label}</button>
          ))}
        </div>
        <div className="report-body">
          {tab === "overall" && (
            <div className="report-section"><p style={{ lineHeight: 1.75 }}>{report.overall}</p></div>
          )}
          {tab === "grammar" && (
            <div className="report-section">
              {(report.grammar || []).map((g, i) => (
                <div key={i} className="report-grammar-item">
                  <div className="rgi-issue">{g.issue}</div>
                  <div className="rgi-row"><span className="rgi-label">{ko ? "예시" : "Example"}</span><span className="rgi-example">{g.example}</span></div>
                  <div className="rgi-row"><span className="rgi-label">{ko ? "수정" : "Fix"}</span><span className="rgi-correction">{g.correction}</span></div>
                </div>
              ))}
              {!(report.grammar?.length) && <p className="report-empty">{ko ? "문법 피드백 없음" : "No grammar feedback"}</p>}
            </div>
          )}
          {tab === "vocabulary" && (
            <div className="report-section">
              {(report.vocabulary || []).map((v, i) => (
                <div key={i} className="report-vocab-item">
                  <span className="rvi-dot">•</span><span>{v.suggestion}</span>
                </div>
              ))}
              {!(report.vocabulary?.length) && <p className="report-empty">{ko ? "어휘 피드백 없음" : "No vocabulary feedback"}</p>}
            </div>
          )}
          {tab === "fluency" && (
            <div className="report-section">
              <p style={{ lineHeight: 1.75 }}>{report.fluency?.notes || (ko ? "유창성 데이터 없음" : "No fluency data")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Waveform =====
function Waveform({ data, isAi, playing, progress, onToggle, duration, t }) {
  return (
    <div className="wave-card">
      <div className="wave-head">
        <div>
          <div className="t">{isAi ? t.waveformCleaned : t.waveformOriginal}</div>
          <div className="s" style={{ marginTop: 2 }}>{isAi ? t.waveformCleanedSub : t.waveformOriginalSub}</div>
        </div>
        <div className={`badge ${isAi ? "ai" : ""}`}>{isAi ? "AI" : "RAW"}</div>
      </div>
      <div className={`wave-box ${isAi ? "" : "original"}`}>
        {data.map((v, i) => {
          const past = (i / data.length) <= progress;
          return (
            <div key={i} className="bar" style={{ height: `${v * 80}%`, opacity: past ? 1 : (isAi ? 0.35 : 0.5) }}/>
          );
        })}
        <div className="playhead" style={{ left: `${10 + progress * (100 - 10 - 2)}%` }}/>
      </div>
      <div className="wave-foot">
        <button className={`play-btn ${isAi ? "ai" : ""}`} onClick={onToggle}>
          <Icon name={playing ? "pause" : "play"} size={11} />
          {playing ? t.pause : t.play}
        </button>
        <div className="wave-time">{fmt(progress * duration)} / {fmt(duration)}</div>
      </div>
    </div>
  );
}

// ===== Gauge =====
function Gauge({ value, max = 5, label, desc, tag, tagClass, warm }) {
  const R = 64;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = C * (1 - pct);
  return (
    <div className="score-card">
      <div className={`gauge ${warm ? "warm" : ""}`}>
        <svg viewBox="0 0 160 160">
          <defs>
            <linearGradient id="gradCyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#06B6D4"/>
            </linearGradient>
            <linearGradient id="gradWarm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#F59E0B"/>
            </linearGradient>
          </defs>
          <circle className="track" cx="80" cy="80" r={R}/>
          <circle className="fill" cx="80" cy="80" r={R} strokeDasharray={C} strokeDashoffset={offset}/>
        </svg>
        <div className="center">
          <div>
            <div className="vv">{value.toFixed(1)}</div>
            <div className="vm">/ {max.toFixed(1)}</div>
            {tag && <div className={`tag ${tagClass}`}>{tag}</div>}
          </div>
        </div>
      </div>
      <div>
        <div className="name">{label}</div>
        <div className="desc" style={{ marginTop: 6 }}>{desc}</div>
      </div>
    </div>
  );
}

// ===== Pronunciation Demo =====
function PronDemo({ t, lang, serverStatus }) {
  const [state, setState] = useStateP("idle");
  const [elapsed, setElapsed] = useStateP(0);
  const elapsedRef = useRefP(0);
  const tickRef = useRefP(null);
  const recorderRef = useRefP(null);

  const [scores, setScores] = useStateP({ art: 4.6, pro: 4.2, overall: 4.4 });
  const [feedbackList, setFeedbackList] = useStateP([t.feedback1, t.feedback2, t.feedback3]);
  const [userText, setUserText] = useStateP("");

  const [playingOrig, setPlayingOrig] = useStateP(false);
  const [playingAi, setPlayingAi] = useStateP(false);
  const [progOrig, setProgOrig] = useStateP(0);
  const [progAi, setProgAi] = useStateP(0);
  const [audioUrl, setAudioUrl] = useStateP(null);
  const [audioDuration, setAudioDuration] = useStateP(0);
  const audioRef = useRefP(null);

  const waveOrig = useMemoP(() => makeWave(101, 110, 0.45), []);
  const waveAi   = useMemoP(() => makeWave(213, 110, 0.55), []);

  useEffectP(() => {
    if (state === "recording") {
      tickRef.current = setInterval(() => {
        elapsedRef.current += 0.1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= 8) stopRec();
      }, 100);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [state]);

  function onAudioTimeUpdate() {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const p = a.currentTime / a.duration;
    setProgOrig(p); setProgAi(p);
  }
  function onAudioEnded() {
    setPlayingOrig(false); setPlayingAi(false);
    setProgOrig(0); setProgAi(0);
  }
  function onAudioLoaded() {
    if (audioRef.current) setAudioDuration(audioRef.current.duration);
  }
  function toggleOrig() {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    if (playingOrig) { a.pause(); setPlayingOrig(false); }
    else { setPlayingAi(false); a.currentTime = 0; a.play().catch(() => {}); setPlayingOrig(true); }
  }
  function toggleAi() {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    if (playingAi) { a.pause(); setPlayingAi(false); }
    else { setPlayingOrig(false); a.currentTime = 0; a.play().catch(() => {}); setPlayingAi(true); }
  }

  const startRec = async () => {
    elapsedRef.current = 0; setElapsed(0); setState("recording");
    recorderRef.current = window.SENA_API.recorder();
    try {
      await recorderRef.current.start();
    } catch (e) {
      setState("idle");
      if (e.message === "MIC_INSECURE") {
        alert(lang === "ko"
          ? "마이크 접근을 위해 HTTPS 또는 localhost로 접속해야 합니다.\n\nhttp://localhost:8000 으로 접속해주세요."
          : "Mic access requires HTTPS or localhost.\n\nPlease open http://localhost:8000 instead.");
      } else {
        alert(lang === "ko"
          ? "마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
          : "Microphone access denied. Please allow mic permission in your browser settings.");
      }
    }
  };
  const stopRec = async () => {
    setState("processing");
    try {
      const blob = await recorderRef.current.stop();
      if (!blob || blob.size === 0) throw new Error("empty");
      const result = await window.SENA_API.scorePronunciation(blob, t.sentence, lang);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
      setUserText(result.userText || "");
      setScores({ art: result.articulation, pro: result.prosody, overall: result.overall });
      setFeedbackList(result.feedback);
      setState("done");
    } catch (e) {
      setState("idle");
      if (e.message !== "empty" && !(e instanceof TypeError)) {
        alert(lang === "ko"
          ? "평가 중 오류가 발생했습니다. 서버 상태를 확인해주세요."
          : "An error occurred during evaluation. Please check server status.");
      }
    }
  };
  const tryAgain = () => {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    setPlayingOrig(false); setPlayingAi(false);
    setProgOrig(0); setProgAi(0);
    setUserText(""); setState("idle");
  };
  const onMicClick = () => {
    if (serverStatus !== "online") {
      alert(lang === "ko"
        ? "서버에 연결되어 있지 않습니다.\nstart.bat으로 백엔드 서버를 먼저 실행해주세요."
        : "Server is not connected.\nPlease run start.bat to start the backend server.");
      return;
    }
    if (state === "idle" || state === "done") startRec();
    else if (state === "recording") stopRec();
  };

  const overallTag   = scores.overall >= 4.3 ? t.overallExcellent : scores.overall >= 3.8 ? t.overallGood : t.overallNeedsWork;
  const overallClass = scores.overall >= 4.3 ? "good" : scores.overall >= 3.8 ? "fair" : "warn";
  const tagArt = scores.art >= 4.3 ? { text: t.overallExcellent, cls: "good" } : scores.art >= 3.8 ? { text: t.overallGood, cls: "fair" } : { text: t.overallNeedsWork, cls: "warn" };
  const tagPro = scores.pro >= 4.3 ? { text: t.overallExcellent, cls: "good" } : scores.pro >= 3.8 ? { text: t.overallGood, cls: "fair" } : { text: t.overallNeedsWork, cls: "warn" };
  const micLabel = state === "recording" ? t.micRecording : state === "processing" ? t.micProcessing : state === "done" ? t.micDone : t.micIdle;

  return (
    <div className="playground-shell">
      <div className="pg-toolbar">
        <div className="guest-badge"><span className="pulse"></span>{t.guestBadge}</div>
        <div className="font-mono" style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 11, color: "var(--fg-faint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {window.SENA_CONFIG?.useRealBackend
            ? <span><span style={{ color: "#10B981" }}>●</span> Live backend</span>
            : <span><span style={{ color: "var(--cyan-soft)" }}>●</span> Scoring engine v2.4.1</span>}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{t.permissionNotice}</span>
        </div>
      </div>

      <div className="sentence-card">
        <div className="label">{t.sentenceLabel}</div>
        <div className="text">{t.sentence}</div>
        <div className="text-ko">{t.sentenceKo}</div>
        <div className="phon">/aɪ hæd ˈkɔːfi wɪð maɪ frɛnd ˈjɛstərdeɪ/</div>
      </div>

      <div className="pg-grid">
        <div className="recorder-card">
          <div className="mic-wrap">
            <div className="mic-ring"></div>
            <div className="mic-ring r2"></div>
            <div className="mic-ring r3"></div>
            <button
              className={`mic-btn ${state === "recording" ? "recording" : ""} ${state === "processing" ? "processing" : ""}`}
              onClick={onMicClick}
              disabled={state === "processing"}>
              {state === "recording" ? <Icon name="stop" size={42} /> :
               state === "processing" ? <Icon name="spark" size={42} /> :
               <Icon name="mic" size={48} />}
            </button>
          </div>
          <div className={`mic-status ${state === "recording" ? "rec" : ""}`}>
            <span className="dot"></span>{micLabel}
          </div>
          <div className="mic-timer">{fmt(elapsed)}</div>
          <div className="mic-help">
            {state === "idle"       && t.permissionNotice}
            {state === "recording"  && (lang === "ko" ? "또박또박 천천히 읽어주세요." : "Read clearly at a steady pace.")}
            {state === "processing" && (lang === "ko" ? "음운·운율을 분석하는 중입니다…" : "Modeling phonemes and prosody…")}
            {state === "done"       && (lang === "ko" ? "분석이 완료되었습니다. 결과를 확인하세요." : "Analysis complete. Review on the right →")}
          </div>
        </div>

        <div>
          {state !== "done" ? (
            <div className="pg-empty">
              <div className="glyph">
                {state === "processing" ? <Icon name="spark" size={20}/> : <Icon name="mic" size={20}/>}
              </div>
              <div style={{ fontWeight: 500, color: "var(--fg)" }}>
                {state === "recording"  ? (lang === "ko" ? "녹음이 진행 중입니다" : "Recording in progress")
                : state === "processing" ? (lang === "ko" ? "잠시만요, AI가 분석하고 있어요" : "Hang on, the AI is analyzing")
                :                          (lang === "ko" ? "마이크 버튼을 눌러 시작" : "Tap the mic to begin")}
              </div>
              <div style={{ color: "var(--fg-faint)", fontSize: 12.5 }}>
                {lang === "ko" ? "원본 / 정제 파형과 점수가 여기에 표시됩니다." : "Waveforms and scores will appear here."}
              </div>
            </div>
          ) : (
            <div>
              <audio ref={audioRef} src={audioUrl || ""}
                onTimeUpdate={onAudioTimeUpdate} onEnded={onAudioEnded}
                onLoadedMetadata={onAudioLoaded}
                style={{ display: "none" }} />
              <Waveform data={waveOrig} isAi={false} playing={playingOrig} progress={progOrig}
                onToggle={toggleOrig} duration={audioDuration} t={t} />
              <Waveform data={waveAi} isAi={true} playing={playingAi} progress={progAi}
                onToggle={toggleAi} duration={audioDuration} t={t} />
            </div>
          )}
        </div>
      </div>

      {state === "done" && (
        <React.Fragment>
          {userText && (
            <div className="stt-result">
              <span className="stt-label">{lang === "ko" ? "인식된 발화" : "Recognized speech"}</span>
              <span className="stt-text">"{userText}"</span>
            </div>
          )}
          <div className="scores-row">
            <Gauge value={scores.art}     max={5} label={t.scoreArticulation} desc={t.scoreArticulationDesc} tag={tagArt.text} tagClass={tagArt.cls} />
            <Gauge value={scores.pro}     max={5} label={t.scoreProsody}      desc={t.scoreProsodyDesc}      tag={tagPro.text} tagClass={tagPro.cls} warm={scores.pro < 4.0} />
            <Gauge value={scores.overall} max={5} label={t.overallScore}      desc={lang === "ko" ? "두 지표의 종합 평균" : "Weighted average of both"} tag={overallTag} tagClass={overallClass} />
          </div>
          <div className="feedback">
            <div className="ftitle"><span className="dot"></span>{t.feedbackTitle}</div>
            <ul>
              {feedbackList.map((f, i) => (
                <li key={i}><span className="idx">{String(i + 1).padStart(2, "0")}</span><span>{f}</span></li>
              ))}
            </ul>
            <div className="feedback-actions">
              <button className="btn-ghost" onClick={tryAgain}><Icon name="refresh" size={14}/>{t.tryAgain}</button>
              <button className="btn-ghost"><Icon name="save" size={14}/>{t.saveSession}</button>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

// ===== Free Talking Demo =====
const FT_OPEN = {
  ko: {
    opic:      (lv) => lv === "beg"
      ? "안녕하세요! OPIc 준비를 도와드릴게요. 먼저 간단한 자기소개를 영어로 해볼까요?"
      : lv === "adv"
      ? "Hi! Let's do an OPIc Advanced-level warm-up. Could you walk me through a recent experience that challenged you — personally or professionally?"
      : "Hi! Let's practice your OPIc speaking today. Could you start by telling me a little about yourself — what you do, and what you enjoy in your free time?",
    free:      () => "Hey! I'm here to chat — in English. What's on your mind today? Anything interesting happen lately?",
    biz:       () => "Good morning. Let's practice some business English. Imagine we're kicking off a team meeting — could you give me a quick project status update?",
    travel:    () => "Hello! Let's practice travel English. You've just landed at an English-speaking airport. How would you introduce yourself to the immigration officer?",
    interview: () => "Welcome. I'll be your interviewer today. Let's start with the classic — could you tell me about yourself and what brings you to this role?",
    daily:     () => "Hi! Let's just have a casual chat in English. What did you get up to today? Anything fun or interesting?",
  },
  en: {
    opic:      (lv) => lv === "beg"
      ? "Hi! We're doing OPIc prep today. Let's start easy — can you introduce yourself in English?"
      : lv === "adv"
      ? "Hi! OPIc Advanced warm-up. Walk me through a recent challenge — personal or professional."
      : "Hi! Let's practice your OPIc speaking. Tell me a little about yourself — what you do and what you enjoy.",
    free:      () => "Hey! What's on your mind today? Let's just chat.",
    biz:       () => "Good morning. Quick business warm-up — give me a brief status update on something you've been working on.",
    travel:    () => "Hello! You've just arrived at an English-speaking airport. How do you introduce yourself to the immigration officer?",
    interview: () => "Welcome. Tell me about yourself and what brings you to this role.",
    daily:     () => "Hi! What did you get up to today — anything fun or interesting?",
  },
};

function getOpenMsg(topic, level, lang) {
  const map = FT_OPEN[lang] || FT_OPEN.ko;
  const fn = map[topic] || map.opic;
  return fn(level);
}

function FreeTalkDemo({ t, lang, serverStatus }) {
  const ko = lang === "ko";
  const [level, setLevel] = useStateP("int");
  const [topic, setTopic] = useStateP("opic");
  const [messages, setMessages] = useStateP([]);
  const [state, setState] = useStateP("idle"); // idle | listening | thinking | playing
  const [holdTime, setHoldTime] = useStateP(0);
  const holdRef = useRefP(null);
  const recorderRef = useRefP(null);
  const audioRef = useRefP(null);
  const chatBodyRef = useRefP(null);

  // Report state
  const [reportPhase, setReportPhase] = useStateP("idle"); // idle | generating | done
  const [reportData,  setReportData]  = useStateP(null);
  const [sessionId,   setSessionId]   = useStateP(null);
  const [showReport,  setShowReport]  = useStateP(false);

  // Reset conversation whenever topic, level, or lang changes
  useEffectP(() => {
    setMessages([]);
    setReportPhase("idle"); setReportData(null); setSessionId(null); setShowReport(false);
  }, [topic, level, lang]);

  // auto-scroll chat
  useEffectP(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [messages, state]);

  const topicChips = [
    { id: "opic",      label: t.topicOpic },
    { id: "free",      label: t.topicFree },
    { id: "biz",       label: t.topicBiz },
    { id: "travel",    label: t.topicTravel },
    { id: "interview", label: t.topicInterview },
    { id: "daily",     label: t.topicDaily },
  ];
  const levelChips = [
    { id: "beg", label: t.levelBeg },
    { id: "int", label: t.levelInt },
    { id: "adv", label: t.levelAdv },
  ];

  const onMicDown = async () => {
    if (serverStatus !== "online") {
      alert(lang === "ko"
        ? "서버에 연결되어 있지 않습니다.\nstart.bat으로 백엔드 서버를 먼저 실행해주세요."
        : "Server is not connected.\nPlease run start.bat to start the backend server.");
      return;
    }
    if (state !== "idle") return;
    setState("listening");
    setHoldTime(0);
    holdRef.current = setInterval(() => setHoldTime(h => h + 0.1), 100);
    recorderRef.current = window.SENA_API.recorder();
    try {
      await recorderRef.current.start();
    } catch (e) {
      clearInterval(holdRef.current);
      setState("idle");
      if (e.message === "MIC_INSECURE") {
        alert(lang === "ko"
          ? "마이크 접근을 위해 HTTPS 또는 localhost로 접속해야 합니다.\n\nhttp://localhost:8000 으로 접속해주세요."
          : "Mic access requires HTTPS or localhost.\n\nPlease open http://localhost:8000 instead.");
      } else {
        alert(lang === "ko"
          ? "마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
          : "Microphone access denied. Please allow mic permission in browser settings.");
      }
    }
  };

  const onMicUp = async () => {
    if (state !== "listening") return;
    clearInterval(holdRef.current);
    setState("thinking");
    try {
      const blob = await recorderRef.current.stop();
      const cleanHistory = messages.map(m => ({
        who: m.who,
        text: m.text,
        score: m.score || null,
      }));

    const turn = await window.SENA_API.chatTurn({
      level,
      topic,
      history: cleanHistory,
      audioBlob: blob,
      lang,
    });
    console.log("TURN RESULT:", turn);
      const newMessages = [
        ...messages,
        { who: "you", text: turn.userText, score: turn.utteranceScore },
        { who: "ai",  text: turn.aiText, audioB64: turn.aiAudioBase64 || "" },
      ];
      setMessages(newMessages);
      if (turn.aiAudioBase64 && audioRef.current) {
        setState("playing");
        const src = turn.aiAudioBase64.startsWith("data:") ? turn.aiAudioBase64 : `data:audio/wav;base64,${turn.aiAudioBase64}`;
        audioRef.current.src = src;
        audioRef.current.play().catch(() => {});
        audioRef.current.onended = () => setState("idle");
      } else {
        setState("idle");
      }
    } catch (e) {
      setState("idle");
    }
  };

  function replayAudio(b64) {
    if (!audioRef.current || !b64) return;
    audioRef.current.src = b64.startsWith("data:") ? b64 : `data:audio/wav;base64,${b64}`;
    audioRef.current.play().catch(() => {});
  }

  const reset = async () => {
    await window.SENA_API.resetChat({ level, topic, lang }).catch(() => {});
    setMessages([]);
    setState("idle"); setHoldTime(0);
    setReportPhase("idle"); setReportData(null); setSessionId(null); setShowReport(false);
  };

  async function endSession() {
    const userTurns = messages.filter(m => m.who === "you");
    if (userTurns.length < 1) return;
    setReportPhase("generating");
    setShowReport(true);
    try {
      const res = await window.SENA_API.generateReport({ history: messages, lang });
      setSessionId(res.sessionId);
      setReportData(res.report);
      setReportPhase("done");
    } catch (e) {
      setReportPhase("idle"); setShowReport(false);
      alert((ko ? "리포트 생성 실패: " : "Report failed: ") + e.message);
    }
  }

  const userTurnCount = messages.filter(m => m.who === "you").length;
  const promptText = ko
    ? <>당신은 한국인 학습자와 음성으로 대화하는 AI 영어 튜터입니다. 학습자 레벨은 <b>{levelChips.find(c => c.id === level).label}</b>, 오늘의 주제는 <b>{topicChips.find(c => c.id === topic).label}</b>입니다. 자연스러운 후속 질문을 던지세요.</>
    : <>You are an AI English voice tutor for a Korean learner. Learner level: <b>{levelChips.find(c => c.id === level).label}</b>. Today's topic: <b>{topicChips.find(c => c.id === topic).label}</b>. Ask natural follow-up questions.</>;

  return (
    <div className="playground-shell">
      <div className="pg-toolbar">
        <div className="guest-badge"><span className="pulse"></span>{t.guestBadge}</div>
        <div className="font-mono" style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 11, color: "var(--fg-faint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {window.SENA_CONFIG?.useRealBackend
            ? <span><span style={{ color: "#10B981" }}>●</span> Live · Qwen3-8B · GPU</span>
            : <span><span style={{ color: "var(--cyan-soft)" }}>●</span> Qwen3-8B · in-house GPU</span>}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{t.permissionNotice}</span>
        </div>
      </div>

      <div className="ft-grid">
        {/* Left: pickers + system prompt */}
        <div className="ft-left">
          <div className="ft-pick">
            <div className="ft-pick-label">{t.ftLevelLabel}</div>
            <div className="ft-level-row">
              {levelChips.map(c => (
                <button key={c.id} className={`ft-lv-btn ${level === c.id ? "active" : ""}`}
                  onClick={() => setLevel(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="ft-pick">
            <div className="ft-pick-label">{t.ftTopicLabel}</div>
            <div className="ft-topic-row">
              {topicChips.map(c => (
                <button key={c.id} className={`ft-chip ${topic === c.id ? "active" : ""}`}
                  onClick={() => setTopic(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="ft-prompt-card">
            <div className="ft-prompt-head">
              <span className="font-mono" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--cyan-ink)", textTransform: "uppercase" }}>
                &lt;{t.ftSystemPrompt}&gt;
              </span>
              <span className="font-mono" style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>Qwen3-8B · fine-tuned</span>
            </div>
            <div className="ft-prompt-body">{promptText}</div>
          </div>
        </div>

        {/* Right: chat */}
        <div className="ft-right">
          <div className="ft-chat-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="ft-avatar"><Icon name="chat" size={14}/></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>SENA Tutor</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
                  {levelChips.find(c => c.id === level).label} · {topicChips.find(c => c.id === topic).label}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={reset}>
                <Icon name="refresh" size={12}/>{t.ftReset}
              </button>
              <button
                className="end-session-btn"
                onClick={endSession}
                disabled={userTurnCount < 1 || reportPhase === "generating"}
                title={ko ? "대화 리포트 생성" : "Generate session report"}
              >
                {reportPhase === "generating" ? (ko ? "생성 중…" : "Generating…") : (ko ? "세션 리포트" : "Session Report")}
              </button>
            </div>
          </div>

          <div className="ft-chat-body" ref={chatBodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ft-msg ${m.who}`}>
                <div className="ft-msg-meta">{m.who === "ai" ? t.ftAI : t.ftYou}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  <div className="ft-msg-bubble">{m.text}</div>
                  {m.who === "ai" && m.audioB64 && (
                    <button className="ft-ai-replay" title={ko ? "다시 듣기" : "Replay"} onClick={() => replayAudio(m.audioB64)}>▶</button>
                  )}
                </div>
                {m.who === "you" && m.score && (
                  <div className="ft-utter-score">
                    <span className="font-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--fg-faint)", textTransform: "uppercase" }}>{t.ftScoringLabel}</span>
                    <span className="ft-sscore">{t.ftArt} <b>{m.score.articulation.toFixed(1)}</b></span>
                    <span className="ft-sscore">{t.ftPro} <b>{m.score.prosody.toFixed(1)}</b></span>
                  </div>
                )}
              </div>
            ))}
            {(state === "thinking" || state === "playing") && (
              <div className="ft-msg ai">
                <div className="ft-msg-meta">{t.ftAI}</div>
                <div className="ft-msg-bubble thinking">
                  <span></span><span></span><span></span>
                  <span style={{ marginLeft: 6, color: "var(--fg-faint)", fontSize: 12 }}>
                    {state === "playing" ? (ko ? "음성 재생 중…" : "Playing audio…") : t.ftThinking}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="ft-chat-foot">
            <div className="ft-mic-wrap">
              <button
                className={`ft-mic-btn ${state === "listening" ? "active" : ""}`}
                onMouseDown={onMicDown}
                onMouseUp={onMicUp}
                onMouseLeave={state === "listening" ? onMicUp : undefined}
                onTouchStart={e => { e.preventDefault(); onMicDown(); }}
                onTouchEnd={e => { e.preventDefault(); onMicUp(); }}
                disabled={state === "thinking" || state === "playing"}>
                <Icon name={state === "listening" ? "stop" : "mic"} size={20}/>
              </button>
              <div>
                <div className="ft-mic-label">
                  {state === "listening" ? `${t.ftListening} ${holdTime.toFixed(1)}s` :
                   state === "thinking"  ? t.ftThinking :
                   state === "playing"   ? (ko ? "재생 중…" : "Playing…") :
                                           t.ftSendBtn}
                </div>
                <div className="ft-mic-hint">{t.ftInputHint}</div>
              </div>
            </div>
            <div className="ft-latency font-mono">
              {ko ? "예상 응답 지연" : "Latency"} <span>~820ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* hidden audio for TTS */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Report overlay */}
      {showReport && (
        reportPhase === "generating" ? (
          <div className="report-overlay">
            <div className="report-generating-box">
              <div className="rg-spinner" />
              <p className="rg-label">{ko ? "리포트를 생성하고 있습니다…" : "Generating your report…"}</p>
              <p className="rg-sub">{ko ? "Qwen3가 대화를 분석 중입니다." : "Qwen3 is analyzing your conversation."}</p>
            </div>
          </div>
        ) : reportData ? (
          <ReportModal report={reportData} lang={lang} sessionId={sessionId} onClose={() => setShowReport(false)} />
        ) : null
      )}
    </div>
  );
}

// ===== PlaygroundPage =====
function PlaygroundPage({ t, lang }) {
  const [tab, setTab] = useStateP("talk");
  const [urlTick, setUrlTick] = useStateP(0);
  const [showUrlModal, setShowUrlModal] = useStateP(false);
  const serverStatus = useServerStatus(urlTick);

  function onUrlSaved() { setUrlTick(n => n + 1); }

  return (
    <React.Fragment>
      <PageHeader
        eyebrow={t.pgPageTitle}
        title={tab === "talk" ? t.pgTalkTitle : t.pgPronTitle}
        sub={tab === "talk" ? t.pgTalkSub : t.pgPronSub}
      />
      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <BackendStatusBadge lang={lang} status={serverStatus} onConfigClick={() => setShowUrlModal(true)} />
          <div className="pg-tabs">
            <button className={`pg-tab ${tab === "talk" ? "active" : ""}`} onClick={() => setTab("talk")}>
              <Icon name="chat" size={16}/>{t.playgroundTabTalk}
            </button>
            <button className={`pg-tab ${tab === "pron" ? "active" : ""}`} onClick={() => setTab("pron")}>
              <Icon name="waveform" size={16}/>{t.playgroundTabPron}
            </button>
          </div>
          {tab === "talk"
            ? <FreeTalkDemo t={t} lang={lang} serverStatus={serverStatus} />
            : <PronDemo t={t} lang={lang} serverStatus={serverStatus} />}
        </div>
      </section>
      {showUrlModal && (
        <BackendUrlModal lang={lang} onClose={() => setShowUrlModal(false)} onSave={onUrlSaved} />
      )}
    </React.Fragment>
  );
}

Object.assign(window, { PlaygroundPage });
