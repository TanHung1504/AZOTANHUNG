import React, { useState, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import confetti from 'canvas-confetti';
import { 
  Upload, Clock, CheckCircle2, XCircle, FileText, Play, RotateCcw, 
  Eye, ToggleLeft, ToggleRight, Edit3, Save, ArrowRight, 
  MousePointerClick, Type, Hash, Sparkles, Trophy, Zap, BookOpen,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Shuffle, ArrowBigLeft, ArrowBigRight, Send, Cloud, Link, Copy, Menu, X, Settings, Home, Lock, AlertTriangle, RefreshCcw,
  Maximize, Minimize, ZoomIn, ZoomOut, List, ChevronUp, ChevronDown, Grid, User, Terminal, Check, Volume2, VolumeX, Download
} from 'lucide-react';

// --- CẤU HÌNH GOOGLE FIREBASE ---
// DÁN LINK FIREBASE CỦA BẠN VÀO DÒNG DƯỚI ĐÂY (Nhớ có chữ /exams ở cuối)
const FIREBASE_URL = "https://azotahung-default-rtdb.asia-southeast1.firebasedatabase.app/exams"; 

// --- SOUND ASSETS ---
const SOUNDS = {
    click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    success: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3",
    error: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_78bd1fbafb.mp3?filename=error-126627.mp3",
    finish: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const checkAnswerMatch = (userAns, correctAns) => {
    if (!userAns || !correctAns) return false;
    const uStr = userAns.toString().trim().toLowerCase();
    const cStr = correctAns.toString().trim().toLowerCase();
    const uNumStr = uStr.replace(/,/g, '.');
    const cNumStr = cStr.replace(/,/g, '.');
    if (!isNaN(uNumStr) && !isNaN(cNumStr) && uNumStr !== '' && cNumStr !== '') {
        return parseFloat(uNumStr) === parseFloat(cNumStr);
    }
    return uStr === cStr;
};

const DEMO_EXAM = [
  { id: 1, type: 'single', question: "1 + 1 = ?", options: [{key:"A", text:"2", isCorrect:true}, {key:"B", text:"3", isCorrect:false}] }
];

export default function App() {
  const [screen, setScreen] = useState('upload'); 
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [quickKeyInput, setQuickKeyInput] = useState("");
  const [userAnswers, setUserAnswers] = useState({});
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [checkError, setCheckError] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [examName, setExamName] = useState("Bài Thi Trắc Nghiệm");
  const [scoreData, setScoreData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shareLink, setShareLink] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [shareAsPractice, setShareAsPractice] = useState(false); 
  const [isGuestMode, setIsGuestMode] = useState(false); 
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const timerRef = useRef(null);
  const scrollRef = useRef(null);
  
  const playSound = (type) => {
      if (isMuted) return;
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play error:", e));
  };

  const triggerConfetti = () => {
      var duration = 3 * 1000;
      var animationEnd = Date.now() + duration;
      var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      var random = function(min, max) { return Math.random() * (max - min) + min; };
      var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) { return clearInterval(interval); }
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
  };

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
      if (scrollRef.current) {
          const activeBtn = scrollRef.current.querySelector('.active-q-btn');
          if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
  }, [currentQuestionIndex]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const binId = params.get('id');
    const mode = params.get('mode');
    if (binId) {
        setIsLoading(true);
        setIsGuestMode(true); 
        fetch(`${FIREBASE_URL}/${binId}.json`)
        .then(res => res.json())
        .then(data => {
            if(data) {
                setExamName(data.name || "Đề thi của bạn");
                const isPractice = mode === 'practice';
                setIsPracticeMode(isPractice);
                setQuestions(data.qs || []);
                setScreen('edit'); 
            } else {
                alert("Không tìm thấy đề thi này!");
            }
        })
        .catch(err => alert("Lỗi tải đề từ Firebase! Vui lòng kiểm tra lại mạng."))
        .finally(() => setIsLoading(false));
    }
  }, []);

  const handleCreateShareLink = async () => {
      if (!FIREBASE_URL || FIREBASE_URL.includes("PROJECT_ID")) {
          return alert("Bạn chưa cập nhật link FIREBASE_URL ở dòng 15!");
      }
      setIsLoading(true);
      const examData = { name: examName, qs: questions };

      try {
          const response = await fetch(`${FIREBASE_URL}.json`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(examData)
          });

          const data = await response.json();
          if (!response.ok) throw new Error("Lỗi máy chủ Firebase");

          let url = `${window.location.origin}${window.location.pathname}?id=${data.name}`;
          if (shareAsPractice) url += "&mode=practice";
          setShareLink(url);
          
      } catch (error) {
          alert(`Tạo link thất bại!\nLỗi: ${error.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  const startExamFinal = (qsInput = questions, forcePractice = isPracticeMode) => {
    playSound('click');
    const shuffle = (arr) => {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    };

    let shuffledQs = JSON.parse(JSON.stringify(qsInput || []));
    shuffledQs = shuffle(shuffledQs);
    shuffledQs = shuffledQs.map(q => {
        if (q.options && q.options.length > 0) {
            const shuffledOptions = shuffle(q.options);
            const fixedKeyOptions = shuffledOptions.map((opt, index) => {
                let newKey = "";
                if (q.type === 'single') newKey = String.fromCharCode(65 + index); 
                else if (q.type === 'group') newKey = String.fromCharCode(97 + index);
                else newKey = opt.key;
                return { ...opt, key: newKey };
            });
            return { ...q, options: fixedKeyOptions };
        }
        return q;
    });

    setQuestions(shuffledQs);
    setUserAnswers({});
    setCheckedQuestions({});
    setCheckError(null);
    setTimeLeft(shuffledQs.length * 60);
    setCurrentQuestionIndex(0);
    setIsPracticeMode(forcePractice);
    setScreen('exam');
    setShowQuestionGrid(false); 
    if(window.innerWidth <= 1024) setIsSidebarOpen(false); 
  };

  useEffect(() => {
      if (shareLink) {
          const baseUrl = shareLink.split('&')[0]; 
          if (shareAsPractice) {
              if(!baseUrl.includes('mode=practice')) setShareLink(baseUrl + "&mode=practice");
          } else {
              setShareLink(baseUrl.replace("&mode=practice", ""));
          }
      }
  }, [shareAsPractice]);

  const copyToClipboard = () => { navigator.clipboard.writeText(shareLink); alert("Đã copy link!"); };

  const applyQuickKeys = () => {
    if (!quickKeyInput.trim()) return;
    const lines = quickKeyInput.split(/\n/); 
    const newQuestions = [...questions];
    lines.forEach(line => {
        line = line.trim(); if (!line) return;
        if (line.includes(':') || line.includes('|')) {
            const separator = line.includes(':') ? ':' : '|';
            const parts = line.split(separator);
            const qId = parseInt(parts[0]);
            const textAns = parts[1].trim();
            if (newQuestions[qId - 1] && newQuestions[qId - 1].type === 'text') { newQuestions[qId - 1].correctAnswer = textAns; }
            return;
        }
        const match = line.toUpperCase().match(/^(\d+)\s*([A-ZĐS]+)$/);
        if (match) {
            const qId = parseInt(match[1]);
            const keyString = match[2];
            const q = newQuestions[qId - 1];
            if (q) {
                if (q.type === 'single') {
                    const targetKey = keyString.charAt(0);
                    q.options?.forEach(opt => opt.isCorrect = (opt.key === targetKey));
                } else if (q.type === 'group') {
                    const chars = keyString.split('');
                    q.options?.forEach((opt, idx) => {
                        if (chars[idx]) {
                             const c = chars[idx];
                             if (c === 'D' || c === 'Đ') opt.isCorrect = true;
                             else if (c === 'S') opt.isCorrect = false;
                        }
                    });
                }
            }
        }
    });
    setQuestions(newQuestions);
    setQuickKeyInput(""); 
    alert("Đã cập nhật đáp án!");
  };

  const handleCheckQuestion = (qId, overrideAns = undefined) => {
      const q = questions.find(item => item.id === qId);
      if(!q) return;
      const uAns = overrideAns !== undefined ? overrideAns : userAnswers[qId];
      let isCorrect = false;

      if (q.type === 'single') {
          const correctOpt = q.options?.find(o => o.isCorrect);
          if (correctOpt && uAns === correctOpt.key) isCorrect = true;
      } else if (q.type === 'group') {
          const allCorrect = q.options?.every(opt => {
              const choice = uAns ? uAns[opt.key] : undefined;
              return choice === opt.isCorrect;
          });
          if (allCorrect) isCorrect = true;
      } else if (q.type === 'text') {
          if (checkAnswerMatch(uAns, q.correctAnswer)) isCorrect = true;
      }

      if (isCorrect) {
          playSound('success');
          setCheckedQuestions(prev => ({ ...prev, [qId]: true }));
          setCheckError(null); 
      } else {
          playSound('error');
          setCheckError(qId);
      }
      if (overrideAns !== undefined) {
          setUserAnswers(prev => ({ ...prev, [qId]: overrideAns }));
      }
  };

  const handleNextQuestion = () => { if (currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); } };
  const handlePrevQuestion = () => { if (currentQuestionIndex > 0) { setCurrentQuestionIndex(prev => prev - 1); } };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setExamName(file.name.replace('.docx', ''));
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const options = {
        styleMap: ["u => u", "b => b", "i => i", "strike => strike", "highlight => mark"],
        convertImage: mammoth.images.imgElement((image) => {
          return image.read("base64").then((imageBuffer) => {
            return { src: "data:" + image.contentType + ";base64," + imageBuffer };
          });
        })
      };
      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      parseHtmlToQuestions(result.value);
    };
    reader.readAsArrayBuffer(file);
  };

  const parseHtmlToQuestions = (htmlString) => {
    const parser = new DOMParser(); 
    const doc = parser.parseFromString(htmlString, 'text/html');
    const paragraphs = Array.from(doc.body.querySelectorAll('p'));
    let parsedQuestions = [], currentQuestion = null; 
    
    const strongQuestionRegex = /^Câu\s+\d+[:\.]/i; 
    const weakQuestionRegex = /^\d+[:\.]/i;       
    const shortAnswerRegex = /^(Đáp án|HD|Lời giải|Answer)[:\.]\s*(.+)/i;
    const groupKeywords = /đúng hay sai|các nhận định|các mệnh đề/i;

    paragraphs.forEach((p) => {
      let text = p.textContent.trim(); 
      const htmlContent = p.innerHTML;
      if (!text && !p.querySelector('img')) return;

      const uTag = p.querySelector('u'); 
      const bTag = p.querySelector('b') || p.querySelector('strong'); 
      const markTag = p.querySelector('mark');
      let isMarkedCorrect = !!(uTag || markTag || (bTag && bTag.textContent.trim().length > 3));

      const isStrongStart = text.match(strongQuestionRegex); 
      const isWeakStart = text.match(weakQuestionRegex);
      
      const optMatch = text.match(/^([a-dA-D])[\.\)\/]\s*(.*)/);

      let isNewQuestion = false;
      if (isStrongStart && !optMatch) isNewQuestion = true; 
      else if (isWeakStart && !optMatch) {
          if (currentQuestion && (!currentQuestion.options || currentQuestion.options.length === 0)) isNewQuestion = false; 
          else isNewQuestion = true;
      }

      if (isNewQuestion) {
        if (currentQuestion) parsedQuestions.push(currentQuestion);
        
        let qType = 'single';
        if (groupKeywords.test(text)) qType = 'group';

        currentQuestion = { id: parsedQuestions.length + 1, question: text || htmlContent, type: qType, options: [], correctAnswer: "" };
        return; 
      }
      
      if (!currentQuestion) return;
      
      const shortMatch = text.match(shortAnswerRegex);
      if (shortMatch) { currentQuestion.type = 'text'; currentQuestion.correctAnswer = shortMatch[2].trim(); currentQuestion.options = []; return; }
      
      if (optMatch) {
          const letter = optMatch[1].toUpperCase(); 
          
          let cleanHtml = htmlContent;
          if(cleanHtml.match(/^([a-dA-D])[\.\)\/]\s*/i)) {
              cleanHtml = cleanHtml.replace(/^([a-dA-D])[\.\)\/]\s*/i, '');
          } else {
              cleanHtml = optMatch[2];
          }
          currentQuestion.options.push({ key: letter, text: cleanHtml, isCorrect: isMarkedCorrect }); 
          return;
      }
      
      if (!currentQuestion.options || currentQuestion.options.length === 0) { 
          currentQuestion.question += `<br/>${htmlContent}`; 
          if (groupKeywords.test(text)) currentQuestion.type = 'group'; 
      }
    });
    
    if (currentQuestion) parsedQuestions.push(currentQuestion);
    if (parsedQuestions.length > 0) { setQuestions(parsedQuestions); setScreen('edit'); } else { alert("Lỗi: Không tìm thấy câu hỏi nào!"); }
  };

  const handleCreateDemo = () => { setExamName("Đề Demo"); setQuestions(DEMO_EXAM); setScreen('edit'); };
  const handleTextAnswerEdit = (qIndex, newText) => { const newQuestions = [...questions]; newQuestions[qIndex].correctAnswer = newText; setQuestions(newQuestions); };
  
  const toggleCorrectAnswer = (qIndex, optKey) => { 
      const newQuestions = [...questions]; const q = newQuestions[qIndex]; 
      if (q.type === 'single') q.options?.forEach(opt => opt.isCorrect = (opt.key === optKey)); 
      else if (q.type === 'group') { const opt = q.options?.find(o => o.key === optKey); if (opt) opt.isCorrect = !opt.isCorrect; } 
      setQuestions(newQuestions); 
  };

  useEffect(() => {
    if (screen === 'exam' && timeLeft > 0 && !isPracticeMode) { timerRef.current = setInterval(() => { setTimeLeft((prev) => { if (prev <= 1) { handleSubmit(); return 0; } return prev - 1; }); }, 1000); }
    return () => clearInterval(timerRef.current);
  }, [screen, timeLeft, isPracticeMode]);

  const handleAnswerChange = (qId, val, type, subKey = null) => { 
      if (isPracticeMode && checkedQuestions[qId]) return;
      if (checkError === qId) setCheckError(null);
      playSound('click');
      setUserAnswers(prev => { 
          if (type === 'single' || type === 'text') return { ...prev, [qId]: val }; 
          else { const currentGroup = prev[qId] || {}; return { ...prev, [qId]: { ...currentGroup, [subKey]: val } }; } 
      }); 
  };
  
  const handleSubmit = () => { 
      playSound('finish');
      triggerConfetti();
      clearInterval(timerRef.current); 
      calculateScore(); 
      window.scrollTo(0, 0); 
      setScreen('result'); 
  };
  
  const calculateScore = () => {
    let totalPoints = 0, maxPoints = questions.length, correctCount = 0;
    questions.forEach(q => {
      const uAns = userAnswers[q.id];
      if (q.type === 'single') { const correctOpt = q.options?.find(o => o.isCorrect); if (correctOpt && uAns === correctOpt.key) { totalPoints += 1; correctCount++; } } 
      else if (q.type === 'group') { let subCorrect = 0; q.options?.forEach(opt => { const userChoice = uAns ? uAns[opt.key] : undefined; if (userChoice !== undefined && userChoice === opt.isCorrect) subCorrect++; }); const point = subCorrect / 4; totalPoints += point; if (point === 1) correctCount++; } 
      else if (q.type === 'text') { if (checkAnswerMatch(uAns, q.correctAnswer)) { totalPoints += 1; correctCount++; } }
    });
    setScoreData({ score: ((totalPoints / maxPoints) * 10).toFixed(2), correctCount, total: questions.length });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (screen !== 'exam') return;
        const currentQ = questions[currentQuestionIndex]; 
        if (!currentQ) return;
        
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
        if (e.key === 'Enter') {
            e.preventDefault(); 
            if (isTyping && e.target) {
                if (isPracticeMode && !checkedQuestions[currentQ.id]) { handleCheckQuestion(currentQ.id, e.target.value); } 
                else { if (currentQuestionIndex < questions.length - 1) handleNextQuestion(); else handleSubmit(); }
                return;
            }
            if (isPracticeMode && !checkedQuestions[currentQ.id]) { handleCheckQuestion(currentQ.id); } 
            else { if (currentQuestionIndex < questions.length - 1) handleNextQuestion(); else handleSubmit(); }
            return;
        }
        if (isTyping) return;
        if (e.key === 'ArrowRight') handleNextQuestion();
        if (e.key === 'ArrowLeft') handlePrevQuestion();
        if (['1', '2', '3', '4'].includes(e.key) && currentQ.type === 'single') {
            const idx = parseInt(e.key) - 1;
            if (currentQ.options && currentQ.options[idx]) { handleAnswerChange(currentQ.id, currentQ.options[idx].key, 'single'); }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, currentQuestionIndex, questions, isPracticeMode, checkedQuestions, checkError, userAnswers]);

  if (isLoading) return <div className="h-[100dvh] flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#1cb0f6]"></div></div>;

  const currentQ = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="h-[100dvh] w-full bg-white text-[#4b4b4b] flex flex-col font-sans overflow-hidden selection:bg-[#ddf4ff] selection:text-[#1cb0f6]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .btn-duo { transition: all 0.15s ease; }
        .btn-duo:active:not(:disabled) { border-bottom-width: 2px !important; transform: translateY(2px); }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #cecece; }
      `}</style>

      {/* HEADER THU GỌN LẠI (h-14 / sm:h-16) */}
      <header className="h-14 sm:h-16 shrink-0 border-b-2 border-[#e5e5e5] flex justify-between items-center px-3 sm:px-6 bg-white z-50">
        <div className="flex items-center gap-3">
            {screen === 'exam' ? (
                <button onClick={() => { if(confirm("Thoát bài thi?")) setScreen('upload'); }} className="btn-duo w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-[#e5e5e5] border-b-[4px] text-[#afafaf] hover:bg-[#f7f7f7] flex items-center justify-center font-black">
                    <X size={20} strokeWidth={3}/>
                </button>
            ) : (
                <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => !isGuestMode && setScreen('upload')}>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1cb0f6] text-white flex items-center justify-center rounded-xl font-black text-lg shadow-[0_3px_0_#1899d6]">A</div> 
                    <span className="font-black text-lg sm:text-xl tracking-tight hidden sm:block text-[#1cb0f6]">Azota<span className="text-[#58cc02]">Ultra</span></span>
                </div>
            )}
        </div>

        {screen === 'exam' ? (
            <div className="flex-1 max-w-xl mx-3 sm:mx-6 flex items-center justify-end sm:justify-center gap-3">
                <div className="font-bold text-[#afafaf] text-sm hidden sm:block whitespace-nowrap">Tiến độ</div>
                <div className="flex-1 max-w-xs h-3 sm:h-4 bg-[#e5e5e5] rounded-full overflow-hidden relative">
                    <div className="h-full bg-[#58cc02] rounded-full relative transition-all duration-500 ease-out" style={{width: `${progressPercent}%`}}>
                        <div className="absolute top-1 left-2 right-2 h-1 bg-white/30 rounded-full"></div>
                    </div>
                </div>
                
                <button onClick={() => window.innerWidth > 1024 ? setIsSidebarOpen(!isSidebarOpen) : setShowQuestionGrid(true)} className="btn-duo h-9 sm:h-10 px-3 flex items-center justify-center text-[#1cb0f6] bg-[#ddf4ff] rounded-xl border-2 border-[#1cb0f6] border-b-[3px] font-black text-[11px] sm:text-[12px] uppercase tracking-wider gap-1 sm:gap-2">
                    <Grid size={16} strokeWidth={3}/> <span className="hidden sm:block">{isSidebarOpen ? 'Ẩn Map' : 'Hiện Map'}</span>
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="text-[#afafaf] hover:text-[#4b4b4b] transition-colors hidden sm:block">{isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
            </div>
        ) : (
            <div className="flex items-center gap-2 sm:gap-3">
                {installPrompt && (
                    <button onClick={handleInstallApp} className="btn-duo flex items-center gap-1.5 px-3 py-1.5 bg-[#ffc800] border-[#e5b400] border-b-[3px] text-white rounded-xl font-black text-xs uppercase tracking-wider"><Download size={16}/> App</button>
                )}
                {!isGuestMode && screen !== 'upload' && (<button onClick={() => setScreen('upload')} className="btn-duo px-3 py-1.5 bg-white border-2 border-[#e5e5e5] border-b-[3px] text-[#afafaf] font-bold text-sm rounded-xl hover:bg-[#f7f7f7]">TRANG CHỦ</button>)}
            </div>
        )}
      </header>

      <main className={`flex-1 w-full flex flex-col items-center min-h-0 ${screen === 'exam' ? 'overflow-hidden bg-[#f7f7f7] sm:bg-white' : 'overflow-y-auto custom-scroll p-3 sm:p-5'}`}>
        
        {/* --- CÁC MÀN HÌNH CHỜ THI --- */}
        {screen === 'upload' && !isGuestMode && (
          <div className="flex flex-col items-center justify-center w-full max-w-xl py-8 sm:py-10 animate-fade-in-up">
             <div className="w-20 h-20 bg-[#ddf4ff] rounded-full flex items-center justify-center mx-auto mb-5 text-[#1cb0f6]"><Upload size={40} strokeWidth={2.5}/></div>
             <h2 className="text-2xl sm:text-3xl font-black text-[#3c3c3c] mb-2 text-center">Tạo & Chia Sẻ Đề</h2>
             <p className="text-[#afafaf] mb-8 text-sm sm:text-base text-center font-bold">Upload file Word để trải nghiệm giao diện siêu việt.</p>
             
             <div className="flex gap-3 w-full mb-6">
                <button onClick={() => setIsPracticeMode(false)} className={`btn-duo flex-1 py-3 rounded-2xl font-black text-base sm:text-lg border-2 border-b-[4px] ${!isPracticeMode ? 'bg-[#ddf4ff] border-[#1cb0f6] text-[#1cb0f6]' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>🔥 THI THỬ</button>
                <button onClick={() => setIsPracticeMode(true)} className={`btn-duo flex-1 py-3 rounded-2xl font-black text-base sm:text-lg border-2 border-b-[4px] ${isPracticeMode ? 'bg-[#d7ffb8] border-[#58a700] text-[#58a700]' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>🌱 LUYỆN TẬP</button>
             </div>
             
             <label className="btn-duo block w-full bg-[#58cc02] border-[#58a700] border-b-[4px] text-white py-4 rounded-2xl font-black text-lg sm:text-xl text-center cursor-pointer hover:bg-[#46a302] mb-5">
                 TẢI LÊN FILE (.DOCX)
                 <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} />
             </label>
             <button onClick={handleCreateDemo} className="font-bold text-[#1cb0f6] uppercase tracking-wider text-xs sm:text-sm hover:underline">Dùng thử đề mẫu ngay</button>
          </div>
        )}

        {screen === 'edit' && !isGuestMode && (
          <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 w-full max-w-6xl">
             <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border-2 border-[#e5e5e5] p-5 sm:p-6">
               <div className="flex justify-between items-center mb-5 pb-5 border-b-2 border-[#e5e5e5]">
                 <h2 className="text-xl sm:text-2xl font-black text-[#3c3c3c] flex items-center gap-2"><Edit3 size={24} className="text-[#1cb0f6]"/> Duyệt Đề</h2>
                 <span className="bg-[#ffc800] text-white px-3 py-1 rounded-xl font-black uppercase text-xs shadow-[0_3px_0_#e5b400]">{questions.length} câu</span>
               </div>
               
               <div className="space-y-4 sm:space-y-5">
                 {questions.map((q, idx) => (
                   <div key={q.id} className="border-2 border-[#e5e5e5] rounded-2xl p-4 sm:p-5 transition-colors hover:border-[#1cb0f6]">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                          <div className="font-bold text-[#4b4b4b] text-base sm:text-lg flex gap-2 leading-relaxed">
                             <span className="text-[#1cb0f6] font-black shrink-0">Câu {idx + 1}:</span>
                             <span dangerouslySetInnerHTML={{ __html: q.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />
                          </div>
                          <button onClick={() => { const newQs = [...questions]; newQs[idx].type = newQs[idx].type === 'single' ? 'group' : 'single'; setQuestions(newQs); }} className="btn-duo px-3 py-1.5 bg-[#ddf4ff] border-2 border-[#1cb0f6] border-b-[3px] text-[#1cb0f6] rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider shrink-0 whitespace-nowrap">
                              {q.type === 'single' ? 'Đổi dạng Đúng/Sai' : 'Đổi dạng Chọn 1'}
                          </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {q.options?.map(opt => (
                            <div key={opt.key} onClick={() => toggleCorrectAnswer(idx, opt.key)} className={`btn-duo p-2 sm:p-3 rounded-xl border-2 border-b-[3px] cursor-pointer flex items-center gap-2 font-bold text-sm sm:text-base ${opt.isCorrect ? 'bg-[#d7ffb8] border-[#58a700] text-[#58a700]' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>
                                <span className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border-2 ${opt.isCorrect ? 'bg-white border-[#58a700] text-[#58a700]' : 'bg-white border-[#e5e5e5]'}`}>{opt.key}</span>
                                <span className="text-[#4b4b4b] line-clamp-2">{opt.text}</span>
                            </div>
                        ))}
                        {q.type === 'text' && <input type="text" value={q.correctAnswer} onChange={(e) => handleTextAnswerEdit(idx, e.target.value)} className="border-2 border-[#e5e5e5] rounded-xl p-2.5 w-full font-bold text-[#58a700] text-sm focus:border-[#1cb0f6] outline-none"/>}
                      </div>
                   </div>
                 ))}
               </div>
             </div>

             <div className="w-full lg:w-[280px] flex flex-col gap-5 shrink-0">
                <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#e5e5e5] p-5 text-center">
                    <h3 className="font-black text-lg sm:text-xl mb-4 text-[#3c3c3c]">Chia Sẻ & Thi</h3>
                    <div className="flex items-center justify-center gap-2 mb-4 bg-[#f7f7f7] p-2 rounded-xl cursor-pointer" onClick={() => setShareAsPractice(!shareAsPractice)}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${shareAsPractice ? 'bg-[#1cb0f6] border-[#1cb0f6]' : 'bg-white border-[#afafaf]'}`}>{shareAsPractice && <Check size={14} className="text-white" strokeWidth={4} />}</div>
                        <span className="text-xs sm:text-sm font-bold text-[#4b4b4b]">Tạo link Luyện tập</span>
                    </div>
                     
                    {!shareLink ? (
                        <button onClick={handleCreateShareLink} className="btn-duo w-full bg-[#1cb0f6] text-white py-3 rounded-xl border-2 border-[#1899d6] border-b-[4px] font-black uppercase tracking-wider mb-4 text-sm sm:text-base">
                            {isLoading ? "Đang tạo..." : "TẠO LINK"}
                        </button>
                    ) : (
                        <div className="bg-[#ddf4ff] border-2 border-[#1cb0f6] p-3 rounded-xl mb-4 text-left">
                            <div className="bg-white text-[#1cb0f6] p-1.5 rounded-lg font-bold text-[10px] sm:text-xs truncate mb-2">{shareLink}</div>
                            <button onClick={copyToClipboard} className="btn-duo w-full bg-[#58cc02] border-[#58a700] border-b-[3px] text-white py-2 rounded-xl font-black uppercase text-xs sm:text-sm">Sao chép Link</button>
                        </div>
                    )}
                    
                    <button onClick={() => startExamFinal(questions)} className="btn-duo w-full bg-[#ffc800] text-white py-3 rounded-xl border-2 border-[#e5b400] border-b-[4px] font-black text-base sm:text-lg uppercase tracking-wider shadow-[0_3px_10px_rgba(255,200,0,0.3)]">
                        THI TRỰC TIẾP
                    </button>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#e5e5e5] p-5">
                    <div className="font-black text-[#3c3c3c] text-sm sm:text-base mb-3 flex items-center gap-2"><Type size={18}/> Sửa Key Nhanh</div>
                    <textarea className="w-full p-3 border-2 border-[#e5e5e5] rounded-xl text-xs sm:text-sm h-24 font-mono font-bold text-[#4b4b4b] focus:border-[#1cb0f6] outline-none mb-3 custom-scroll" placeholder="1A&#10;2B..." value={quickKeyInput} onChange={(e) => setQuickKeyInput(e.target.value)}></textarea>
                    <button onClick={applyQuickKeys} className="btn-duo w-full bg-[#f7f7f7] border-2 border-[#e5e5e5] border-b-[3px] text-[#afafaf] hover:text-[#4b4b4b] py-2 rounded-xl font-black text-xs sm:text-sm uppercase">Cập nhật nhanh</button>
                </div>
             </div>
          </div>
        )}

        {screen === 'edit' && isGuestMode && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#e5e5e5] text-center max-w-md w-full shadow-lg">
                    <div className="w-20 h-20 mx-auto bg-[#ddf4ff] rounded-full flex items-center justify-center mb-5">
                        <BookOpen size={40} className="text-[#1cb0f6]"/>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#3c3c3c] mb-3 leading-tight">{examName}</h2>
                    <div className="flex justify-center gap-2 mb-8">
                        <span className="px-3 py-1 bg-[#f7f7f7] rounded-lg text-xs font-black text-[#afafaf] border-2 border-[#e5e5e5] uppercase">{questions.length} câu hỏi</span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase border-2 ${isPracticeMode ? 'bg-[#d7ffb8] text-[#58a700] border-[#58a700]' : 'bg-[#ddf4ff] text-[#1cb0f6] border-[#1cb0f6]'}`}>{isPracticeMode ? 'Luyện Tập' : 'Thi Thử'}</span>
                    </div>
                    <button onClick={() => startExamFinal(questions)} className="btn-duo w-full bg-[#58cc02] border-[#58a700] border-b-[4px] text-white py-4 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-[#46a302]">
                        BẮT ĐẦU NGAY
                    </button>
                </div>
            </div>
        )}

        {/* --- MÀN HÌNH LÀM BÀI ĐƯỢC THU NHỎ LẠI --- */}
        {screen === 'exam' && currentQ && (
            <div className="flex-1 flex flex-col lg:flex-row max-w-6xl w-full mx-auto p-0 sm:p-4 gap-0 sm:gap-4 min-h-0 overflow-hidden relative">
                
                {/* OVERLAY MAP TRÊN MOBILE */}
                {showQuestionGrid && (
                    <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col p-4 sm:p-5 animate-fade-in lg:hidden">
                        <div className="flex justify-between items-center mb-5 pt-2 shrink-0">
                            <h3 className="font-black text-xl text-[#3c3c3c]">Bản Đồ Câu Hỏi</h3>
                            <button onClick={() => setShowQuestionGrid(false)} className="btn-duo w-10 h-10 bg-white rounded-xl border-2 border-[#e5e5e5] border-b-[4px] text-[#afafaf] flex items-center justify-center font-black"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scroll flex flex-wrap gap-2.5 content-start pb-4 min-h-0">
                            {questions.map((q, idx) => {
                                const isDone = checkedQuestions[q.id] || userAnswers[q.id] !== undefined, isCurrent = idx === currentQuestionIndex;
                                let style = "bg-white border-[#e5e5e5] text-[#afafaf] border-b-[3px]";
                                if (isCurrent) style = "bg-[#1cb0f6] border-[#1899d6] text-white border-b-[3px]";
                                else if (isDone) style = "bg-[#ddf4ff] border-[#1cb0f6] text-[#1cb0f6] border-b-[3px]";
                                return <button key={q.id} onClick={() => { setCurrentQuestionIndex(idx); setShowQuestionGrid(false); }} className={`btn-duo w-[42px] h-[42px] rounded-xl border-2 font-black text-sm flex items-center justify-center ${style}`}>{idx + 1}</button>
                            })}
                        </div>
                        <button onClick={() => {setShowQuestionGrid(false); handleSubmit();}} className="btn-duo w-full shrink-0 mt-3 bg-[#ff4b4b] border-[#ea2b2b] border-b-[4px] text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider">NỘP BÀI NGAY</button>
                    </div>
                )}

                {/* CỘT TRÁI: Câu Hỏi & Đáp Án */}
                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:border-2 sm:border-[#e5e5e5] p-3 sm:p-5 pb-20 sm:pb-5">
                    {/* Header câu hỏi */}
                    <div className="flex items-center gap-2 mb-3 sm:mb-4 shrink-0">
                        <div className="px-3 py-1.5 bg-[#ffc800] text-white rounded-lg font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_2px_0_#e5b400]">Câu {currentQuestionIndex + 1}</div>
                        <span className="font-bold text-[#afafaf] text-[11px] sm:text-xs uppercase hidden sm:block">| {currentQ.type === 'single' ? 'Trắc nghiệm một lựa chọn' : currentQ.type === 'group' ? 'Trắc nghiệm đúng/sai' : 'Trả lời ngắn'}</span>
                    </div>

                    {/* KHU VỰC CUỘN */}
                    <div className="flex-1 overflow-y-auto custom-scroll pr-1 sm:pr-2 pb-2 min-h-0">
                        <div className="text-[#3c3c3c] text-[17px] sm:text-xl font-black leading-relaxed mb-4 sm:mb-5 [&>img]:rounded-xl [&>img]:my-3 [&>img]:shadow-sm [&>img]:border [&>img]:border-[#e5e5e5]" dangerouslySetInnerHTML={{ __html: currentQ.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />
                        
                        {isPracticeMode && checkedQuestions[currentQ.id] && (<div className="mb-4 p-3 sm:p-4 bg-[#d7ffb8] border-2 border-[#58a700] rounded-xl flex items-center gap-3 animate-bounce"><div className="w-9 h-9 bg-[#58cc02] rounded-full flex items-center justify-center text-white shrink-0"><Check size={20} strokeWidth={3}/></div><h4 className="font-black text-[#58a700] text-base sm:text-lg">Tuyệt vời! Chính xác.</h4></div>)}
                        {checkError === currentQ.id && (<div className="mb-4 p-3 sm:p-4 bg-[#ffdfe0] border-2 border-[#ea2b2b] rounded-xl flex items-center gap-3 animate-pulse"><div className="w-9 h-9 bg-[#ff4b4b] rounded-full flex items-center justify-center text-white shrink-0"><X size={20} strokeWidth={3}/></div><h4 className="font-black text-[#ea2b2b] text-base sm:text-lg">Chưa đúng! Thử lại nào.</h4></div>)}

                        {/* Đáp án */}
                        <div className="flex flex-col gap-3 pb-1">
                            {currentQ.type === 'single' && currentQ.options?.map((opt) => {
                                const uAns = userAnswers[currentQ.id], isChecked = isPracticeMode && checkedQuestions[currentQ.id], isError = checkError === currentQ.id, isSelected = uAns === opt.key;
                                let wrapperStyle = "bg-white border-[#e5e5e5] text-[#4b4b4b] border-b-[3px] hover:bg-[#f7f7f7]";
                                let boxStyle = "border-[#e5e5e5] text-[#afafaf] bg-white";
                                if (isChecked) { if (opt.isCorrect) { wrapperStyle = "bg-[#d7ffb8] border-[#58a700] border-b-[3px] text-[#58a700]"; boxStyle = "bg-white border-[#58a700] text-[#58a700]"; } else if (isSelected) { wrapperStyle = "bg-gray-100 border-[#e5e5e5] opacity-50"; boxStyle = "bg-white border-[#e5e5e5]"; } else { wrapperStyle = "bg-white border-[#e5e5e5] opacity-30"; boxStyle = "bg-white border-[#e5e5e5]"; } } 
                                else if (isError && isSelected) { wrapperStyle = "bg-[#ffdfe0] border-[#ea2b2b] border-b-[3px] text-[#ea2b2b]"; boxStyle = "bg-white border-[#ea2b2b] text-[#ea2b2b]"; } 
                                else if (isSelected) { wrapperStyle = "bg-[#ddf4ff] border-[#1cb0f6] border-b-[3px] text-[#1cb0f6]"; boxStyle = "bg-white border-[#1cb0f6] text-[#1cb0f6]"; }
                                return <div key={opt.key} onClick={() => handleAnswerChange(currentQ.id, opt.key, 'single')} className={`btn-duo w-full p-3 sm:p-4 rounded-xl border-2 font-bold text-[15px] sm:text-base cursor-pointer flex items-center gap-3 ${wrapperStyle}`}><div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 font-black text-sm shrink-0 ${boxStyle}`}>{opt.key}</div><div className="flex-1 leading-snug" dangerouslySetInnerHTML={{ __html: opt.text }}></div></div>
                            })}
                            {currentQ.type === 'group' && currentQ.options?.map((opt) => (
                                <div key={opt.key} className="p-3 sm:p-4 border-2 border-[#e5e5e5] border-b-[3px] rounded-xl bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-[#f7f7f7] transition-colors"><div className="font-bold text-[#4b4b4b] text-[15px] sm:text-base flex-1"><span className="font-black text-[#1cb0f6] mr-1.5">{opt.key}.</span><span dangerouslySetInnerHTML={{ __html: opt.text }}></span></div><div className="flex gap-2 shrink-0">
                                    {['ĐÚNG', 'SAI'].map((label, i) => {
                                        const val = i === 0, myChoice = userAnswers[currentQ.id]?.[opt.key], isLocked = isPracticeMode && checkedQuestions[currentQ.id];
                                        const isActive = myChoice === val;
                                        const btnStyle = isActive ? (val ? 'bg-[#1cb0f6] border-[#1899d6] border-b-[3px] text-white' : 'bg-[#ff4b4b] border-[#ea2b2b] border-b-[3px] text-white') : 'bg-white border-[#e5e5e5] border-b-[3px] text-[#afafaf] hover:bg-[#f7f7f7]';
                                        return <button key={label} onClick={() => !isLocked && handleAnswerChange(currentQ.id, val, 'group', opt.key)} className={`btn-duo px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg border-2 font-black text-[11px] sm:text-xs uppercase tracking-wider ${btnStyle}`}>{label}</button>
                                    })}
                                </div></div>
                            ))}
                            {currentQ.type === 'text' && <input type="text" placeholder="Nhập đáp án..." className="w-full p-4 text-lg bg-white border-2 border-[#e5e5e5] border-b-[3px] rounded-xl text-[#3c3c3c] font-black outline-none focus:border-[#1cb0f6] transition-all" value={userAnswers[currentQ.id] || ''} onChange={(e) => handleAnswerChange(currentQ.id, e.target.value, 'text')} />}
                        </div>
                    </div>

                    {/* Navigation Desktop */}
                    <div className="hidden lg:flex shrink-0 justify-between items-center pt-3 mt-1 border-t-2 border-[#e5e5e5]">
                        <button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className={`btn-duo px-6 py-2.5 rounded-xl border-2 border-b-[3px] font-black uppercase tracking-wider text-sm ${currentQuestionIndex === 0 ? 'bg-[#f7f7f7] border-[#e5e5e5] text-[#afafaf] cursor-not-allowed opacity-50' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>TRỞ LẠI</button>
                        {isPracticeMode ? (
                            <button onClick={() => handleCheckQuestion(currentQ.id)} className={`btn-duo px-8 py-2.5 rounded-xl border-2 border-b-[3px] font-black uppercase tracking-wider text-sm text-white ${checkError === currentQ.id ? 'bg-[#ffc800] border-[#e5b400]' : 'bg-[#58cc02] border-[#58a700] hover:bg-[#46a302]'}`}>{checkError === currentQ.id ? 'THỬ LẠI' : 'KIỂM TRA'}</button>
                        ) : (
                            <button onClick={handleNextQuestion} className="btn-duo px-8 py-2.5 rounded-xl border-2 border-[#1cb0f6] border-b-[3px] bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-black uppercase tracking-wider text-sm">TIẾP THEO</button>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: Thu nhỏ w-[280px] */}
                {isSidebarOpen && (
                    <div className="w-[280px] hidden lg:flex flex-col gap-4 shrink-0 min-h-0">
                        {!isPracticeMode && (
                            <div className="shrink-0 bg-white p-4 rounded-2xl border-2 border-[#e5e5e5] border-b-[3px] flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="text-[#afafaf] font-black uppercase tracking-widest text-[10px] mb-1 z-10">THỜI GIAN CÒN LẠI</div>
                                <div className="text-[#ff4b4b] font-black text-3xl tracking-tight z-10 leading-none">{formatTime(timeLeft)}</div>
                                <Clock className="absolute -right-2 -bottom-2 text-[#e5e5e5] w-16 h-16 opacity-50" />
                            </div>
                        )}

                        <div className="flex-1 flex flex-col min-h-0 bg-white p-4 rounded-2xl border-2 border-[#e5e5e5] border-b-[3px]">
                            <div className="font-black text-[#3c3c3c] text-base mb-3 uppercase tracking-wider shrink-0">
                                MỤC LỤC CÂU HỎI
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scroll flex flex-wrap gap-2 content-start pr-1 min-h-0">
                                {questions.map((q, idx) => {
                                    const isDone = checkedQuestions[q.id] || userAnswers[q.id] !== undefined, isCurrent = idx === currentQuestionIndex;
                                    let style = "bg-white border-[#e5e5e5] text-[#afafaf] border-b-[3px] hover:bg-[#f7f7f7]";
                                    if (isCurrent) style = "bg-[#1cb0f6] border-[#1899d6] text-white border-b-[3px]";
                                    else if (isDone) style = "bg-[#ddf4ff] border-[#1cb0f6] text-[#1cb0f6] border-b-[3px]";
                                    return <button key={q.id} onClick={() => setCurrentQuestionIndex(idx)} className={`btn-duo w-10 h-10 rounded-xl border-2 font-black text-[13px] flex items-center justify-center ${style}`}>{idx + 1}</button>
                                })}
                            </div>

                            <button onClick={handleSubmit} className="shrink-0 btn-duo w-full mt-3 py-3 rounded-xl border-2 border-[#ea2b2b] border-b-[3px] bg-[#ff4b4b] hover:bg-[#e63939] text-white font-black text-sm uppercase tracking-wider">
                                NỘP BÀI THI
                            </button>
                        </div>
                    </div>
                )}

                {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG CHO MOBILE (Nhỏ lại xíu) */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 p-2.5 bg-white border-t-2 border-[#e5e5e5] z-50 flex gap-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                    <button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className="btn-duo w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border-2 border-[#e5e5e5] border-b-[3px] bg-white text-[#afafaf] font-black disabled:opacity-50"><ChevronLeft size={22} strokeWidth={3}/></button>
                    
                    {isPracticeMode ? (
                        <button onClick={() => handleCheckQuestion(currentQ.id)} className={`btn-duo flex-1 rounded-xl border-2 border-b-[3px] text-white font-black text-[13px] uppercase tracking-wider ${checkError === currentQ.id ? 'bg-[#ffc800] border-[#e5b400]' : 'bg-[#58cc02] border-[#58a700]'}`}>{checkError === currentQ.id ? 'THỬ LẠI' : 'KIỂM TRA'}</button>
                    ) : (
                        <div className="flex-1 rounded-xl border-2 border-[#e5e5e5] border-b-[3px] bg-white flex flex-col items-center justify-center pt-0.5 shadow-inner">
                            <span className="text-[8px] font-black text-[#afafaf] uppercase tracking-widest leading-none mb-0.5">Thời Gian</span>
                            <span className="text-lg font-black text-[#ff4b4b] leading-none">{formatTime(timeLeft)}</span>
                        </div>
                    )}

                    <button onClick={currentQuestionIndex < questions.length - 1 ? handleNextQuestion : handleSubmit} className={`btn-duo w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border-2 border-b-[3px] font-black text-white ${currentQuestionIndex < questions.length - 1 ? 'bg-[#1cb0f6] border-[#1899d6]' : 'bg-[#ff4b4b] border-[#ea2b2b]'}`}>{currentQuestionIndex < questions.length - 1 ? <ChevronRight size={22} strokeWidth={3}/> : <Check size={22} strokeWidth={3}/>}</button>
                </div>
            </div>
        )}

        {/* --- MÀN HÌNH KẾT QUẢ ĐÃ THU NHỎ LẠI TỈ LỆ VÀNG --- */}
        {screen === 'result' && scoreData && (
            <div className="w-full max-w-3xl p-4 sm:p-5 pb-20 mx-auto animate-fade-in-up">
                
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border-2 border-[#e5e5e5] border-b-[6px] text-center shadow-sm mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-3 bg-[#ffc800]"></div>
                    <div className="w-20 h-20 bg-[#fff4c2] border-4 border-[#ffc800] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_4px_0_#e5b400] relative">
                        <Trophy size={40} className="text-[#ffc800]"/>
                        <div className="absolute -right-1 -bottom-1 bg-[#58cc02] border-[3px] border-white text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-sm">!</div>
                    </div>
                    <h2 className="text-5xl font-black text-[#ffc800] mb-0 leading-none tracking-tighter drop-shadow-sm">{scoreData.score}</h2>
                    <p className="text-[#afafaf] mb-6 font-black uppercase tracking-[0.2em] text-xs">ĐIỂM TỔNG KẾT</p>
                    
                    <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto mb-6">
                        <div className="bg-[#d7ffb8] p-3 rounded-2xl border-2 border-[#58a700] border-b-[4px] text-[#58a700] flex flex-col items-center">
                            <span className="text-3xl font-black mb-0.5">{scoreData.correctCount}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-80">CÂU ĐÚNG</span>
                        </div>
                        <div className="bg-[#ffdfe0] p-3 rounded-2xl border-2 border-[#ea2b2b] border-b-[4px] text-[#ea2b2b] flex flex-col items-center">
                            <span className="text-3xl font-black mb-0.5">{scoreData.total - scoreData.correctCount}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-80">CÂU SAI</span>
                        </div>
                    </div>
                    <button onClick={() => startExamFinal(questions, false)} className="btn-duo max-w-[240px] w-full mx-auto bg-[#1cb0f6] text-white py-3.5 rounded-xl border-2 border-[#1899d6] border-b-[4px] font-black text-base uppercase tracking-wider block">THỬ LẠI NGAY</button>
                </div>

                <h3 className="text-xl font-black text-[#3c3c3c] mb-5 flex items-center gap-2"><List className="text-[#1cb0f6]" size={24} strokeWidth={3}/> BẢN BÁO CÁO CHI TIẾT</h3>
                
                <div className="space-y-4 sm:space-y-5">
                    {questions.map((q, idx) => {
                        const uAns = userAnswers[q.id];
                        const questionContent = <div className="text-[#4b4b4b] font-bold mb-4 text-base leading-relaxed bg-[#f7f7f7] p-4 rounded-xl border-2 border-[#e5e5e5] [&>img]:rounded-xl [&>img]:my-2" dangerouslySetInnerHTML={{ __html: q.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />;

                        if (q.type === 'single') {
                            const isCorrect = q.options?.find(o => o.isCorrect)?.key === uAns;
                            return (
                                <div key={q.id} className={`p-5 sm:p-6 rounded-[1.5rem] border-2 border-b-[5px] bg-white ${isCorrect ? 'border-[#58a700]' : 'border-[#ea2b2b]'}`}>
                                    <div className={`font-black flex items-center gap-2 pb-3 mb-3 border-b-2 border-[#e5e5e5] text-lg ${isCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>
                                        {isCorrect ? <CheckCircle2 size={24} strokeWidth={3}/> : <XCircle size={24} strokeWidth={3}/>}
                                        CÂU SỐ {idx + 1}
                                    </div>
                                    {questionContent}
                                    <div className="grid grid-cols-1 gap-2.5 mt-3">
                                        {q.options?.map(opt => {
                                            const isSelected = uAns === opt.key, isOptCorrect = opt.isCorrect;
                                            let wrapperStyle = "bg-white border-[#e5e5e5] opacity-50", keyStyle = "bg-white border-[#e5e5e5] text-[#afafaf]", textStyle = "text-[#afafaf]";
                                            if (isOptCorrect) { wrapperStyle = "bg-[#d7ffb8] border-[#58a700] border-b-[3px] opacity-100"; keyStyle = "bg-white border-[#58a700] text-[#58a700]"; textStyle = "text-[#58a700] font-black"; } 
                                            else if (isSelected && !isOptCorrect) { wrapperStyle = "bg-[#ffdfe0] border-[#ea2b2b] border-b-[3px] opacity-100"; keyStyle = "bg-white border-[#ea2b2b] text-[#ea2b2b]"; textStyle = "text-[#ea2b2b] font-black"; }
                                            return (
                                                <div key={opt.key} className={`flex items-center p-3 rounded-xl border-2 transition-all ${wrapperStyle}`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm mr-3 shrink-0 border-2 ${keyStyle}`}>{opt.key}</div>
                                                    <div className={`flex-1 text-[15px] font-bold ${textStyle}`} dangerouslySetInnerHTML={{ __html: opt.text }} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        if (q.type === 'text') {
                            const isCorrect = checkAnswerMatch(uAns, q.correctAnswer);
                            return (
                                <div key={q.id} className={`p-5 sm:p-6 rounded-[1.5rem] border-2 border-b-[5px] bg-white ${isCorrect ? 'border-[#58a700]' : 'border-[#ea2b2b]'}`}>
                                    <div className={`font-black flex items-center gap-2 pb-3 mb-3 border-b-2 border-[#e5e5e5] text-lg ${isCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>
                                        {isCorrect ? <CheckCircle2 size={24} strokeWidth={3}/> : <XCircle size={24} strokeWidth={3}/>} CÂU SỐ {idx + 1}
                                    </div>
                                    {questionContent}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        <div className="bg-[#f7f7f7] p-4 rounded-xl border-2 border-[#e5e5e5]">
                                            <div className="text-[10px] font-black text-[#afafaf] uppercase tracking-widest mb-1.5">ĐÁP ÁN BẠN NHẬP</div>
                                            <div className={`text-lg font-black ${isCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>{uAns || "Trống"}</div>
                                        </div>
                                        <div className="bg-[#ddf4ff] p-4 rounded-xl border-2 border-[#1cb0f6]">
                                            <div className="text-[10px] font-black text-[#1cb0f6] uppercase tracking-widest mb-1.5">ĐÁP ÁN ĐÚNG</div>
                                            <div className="text-lg font-black text-[#1cb0f6]">{q.correctAnswer || "Chưa cấu hình"}</div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        if (q.type === 'group') {
                            return (
                                <div key={q.id} className="p-5 sm:p-6 rounded-[1.5rem] border-2 border-b-[5px] bg-white border-[#1cb0f6]">
                                    <div className="font-black flex items-center gap-2 pb-3 mb-3 border-b-2 border-[#e5e5e5] text-lg text-[#1cb0f6]">
                                        <List size={24} strokeWidth={3}/> CÂU SỐ {idx + 1} (ĐÚNG/SAI)
                                    </div>
                                    {questionContent}
                                    <div className="grid grid-cols-1 gap-3 mt-3">
                                        {q.options?.map(opt => {
                                            const myChoice = uAns ? uAns[opt.key] : undefined, subCorrect = myChoice === opt.isCorrect;
                                            return (
                                                <div key={opt.key} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border-2 border-b-[3px] gap-3 ${subCorrect ? 'bg-[#d7ffb8] border-[#58a700]' : 'bg-[#ffdfe0] border-[#ea2b2b]'}`}>
                                                    <span className={`text-[15px] flex-1 flex gap-2 font-bold ${subCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>
                                                        <span className="font-black">{opt.key}.</span> <span dangerouslySetInnerHTML={{ __html: opt.text }}/>
                                                    </span>
                                                    <div className="flex gap-2 text-xs shrink-0 w-full sm:w-auto">
                                                        <div className="flex-1 sm:flex-none bg-white px-3 py-2 rounded-lg text-center border-2 border-[#e5e5e5]">
                                                            <span className="text-[#afafaf] text-[9px] font-black uppercase tracking-widest block mb-0.5">BẠN CHỌN</span>
                                                            <span className={`font-black ${subCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>{myChoice === true ? 'ĐÚNG' : myChoice === false ? 'SAI' : 'TRỐNG'}</span>
                                                        </div>
                                                        <div className="flex-1 sm:flex-none bg-white px-3 py-2 rounded-lg text-center border-2 border-[#e5e5e5]">
                                                            <span className="text-[#afafaf] text-[9px] font-black uppercase tracking-widest block mb-0.5">ĐÁP ÁN ĐÚNG</span>
                                                            <span className="font-black text-[#1cb0f6]">{opt.isCorrect ? 'ĐÚNG' : 'SAI'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        }
                        return null;
                    })}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
