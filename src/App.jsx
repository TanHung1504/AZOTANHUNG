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

// --- SOUND ASSETS CHUẨN MỚI ---
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State để Ẩn/Hiện Map trên PC

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
    if(window.innerWidth <= 1024) setIsSidebarOpen(false); // Ẩn sidebar trên đt
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

  if (isLoading) return <div className="h-[100dvh] flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#1cb0f6]"></div></div>;

  const currentQ = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    // THAY ĐỔI LỚN 1: Sử dụng h-[100dvh] và overflow-hidden để khóa toàn bộ trang web
    <div className="h-[100dvh] w-full bg-white text-[#4b4b4b] flex flex-col font-sans overflow-hidden selection:bg-[#ddf4ff] selection:text-[#1cb0f6]">
      {/* CSS NỘI BỘ KHÔNG THAY ĐỔI */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .btn-duo { transition: all 0.15s ease; }
        .btn-duo:active:not(:disabled) { border-bottom-width: 2px !important; transform: translateY(2px); }
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #cecece; }
      `}</style>

      {/* HEADER CỐ ĐỊNH */}
      <header className="h-[70px] sm:h-20 shrink-0 border-b-2 border-[#e5e5e5] flex justify-between items-center px-4 sm:px-8 bg-white z-50">
        <div className="flex items-center gap-3 sm:gap-4">
            {screen === 'exam' ? (
                <button onClick={() => { if(confirm("Thoát bài thi?")) setScreen('upload'); }} className="btn-duo w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-[#e5e5e5] border-b-[4px] text-[#afafaf] hover:bg-[#f7f7f7] flex items-center justify-center font-black">
                    <X size={24} strokeWidth={3}/>
                </button>
            ) : (
                <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => !isGuestMode && setScreen('upload')}>
                    <div className="w-10 h-10 bg-[#1cb0f6] text-white flex items-center justify-center rounded-xl font-black text-xl shadow-[0_3px_0_#1899d6]">A</div> 
                    <span className="font-black text-[22px] tracking-tight hidden sm:block text-[#1cb0f6]">Azota<span className="text-[#58cc02]">Ultra</span></span>
                </div>
            )}
        </div>

        {screen === 'exam' ? (
            <div className="flex-1 max-w-2xl mx-4 sm:mx-8 flex items-center justify-end sm:justify-center gap-3 sm:gap-4">
                <div className="font-bold text-[#afafaf] hidden sm:block whitespace-nowrap">Tiến độ</div>
                <div className="flex-1 max-w-xs h-4 sm:h-5 bg-[#e5e5e5] rounded-full overflow-hidden relative">
                    <div className="h-full bg-[#58cc02] rounded-full relative transition-all duration-500 ease-out" style={{width: `${progressPercent}%`}}>
                        <div className="absolute top-1 left-2 right-2 h-1.5 bg-white/30 rounded-full"></div>
                    </div>
                </div>
                
                {/* NÚT TẮT MỞ MAP DÀNH CHO CẢ PC VÀ MOBILE */}
                <button onClick={() => window.innerWidth > 1024 ? setIsSidebarOpen(!isSidebarOpen) : setShowQuestionGrid(true)} className="btn-duo h-10 px-3 sm:px-4 flex items-center justify-center text-[#1cb0f6] bg-[#ddf4ff] rounded-xl border-2 border-[#1cb0f6] border-b-[4px] font-black text-[13px] uppercase tracking-wider gap-2">
                    <Grid size={18} strokeWidth={3}/> <span className="hidden sm:block">{isSidebarOpen ? 'Ẩn Map' : 'Hiện Map'}</span>
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="text-[#afafaf] hover:text-[#4b4b4b] transition-colors hidden sm:block">{isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}</button>
            </div>
        ) : (
            <div className="flex items-center gap-3">
                {installPrompt && (
                    <button onClick={handleInstallApp} className="btn-duo flex items-center gap-2 px-4 py-2 bg-[#ffc800] border-[#e5b400] border-b-[4px] text-white rounded-xl font-black text-sm uppercase tracking-wider"><Download size={18}/> App</button>
                )}
                {!isGuestMode && screen !== 'upload' && (<button onClick={() => setScreen('upload')} className="btn-duo px-4 py-2 bg-white border-2 border-[#e5e5e5] border-b-[4px] text-[#afafaf] font-bold rounded-xl hover:bg-[#f7f7f7]">TRANG CHỦ</button>)}
            </div>
        )}
      </header>

      {/* THAY ĐỔI LỚN 2: Thẻ Main linh hoạt. Nếu đang thi thì đóng cứng không cho cuộn, ngoài ra thì cuộn bình thường */}
      <main className={`flex-1 w-full flex flex-col items-center min-h-0 ${screen === 'exam' ? 'overflow-hidden bg-[#f7f7f7] sm:bg-white' : 'overflow-y-auto custom-scroll p-4 sm:p-6'}`}>
        
        {/* --- CÁC MÀN HÌNH CHỜ THI (UPLOAD, EDIT, GUEST) CỨ ĐỂ BÌNH THƯỜNG --- */}
        {screen === 'upload' && !isGuestMode && (
          <div className="flex flex-col items-center justify-center w-full max-w-xl py-12 animate-fade-in-up">
             <div className="w-24 h-24 bg-[#ddf4ff] rounded-full flex items-center justify-center mx-auto mb-6 text-[#1cb0f6]"><Upload size={48} strokeWidth={2.5}/></div>
             <h2 className="text-3xl font-black text-[#3c3c3c] mb-3 text-center">Tạo & Chia Sẻ Đề</h2>
             <p className="text-[#afafaf] mb-10 text-center font-bold">Upload file Word để trải nghiệm giao diện siêu việt.</p>
             
             <div className="flex gap-4 w-full mb-8">
                <button onClick={() => setIsPracticeMode(false)} className={`btn-duo flex-1 py-4 rounded-2xl font-black text-lg border-2 border-b-[4px] ${!isPracticeMode ? 'bg-[#ddf4ff] border-[#1cb0f6] text-[#1cb0f6]' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>🔥 THI THỬ</button>
                <button onClick={() => setIsPracticeMode(true)} className={`btn-duo flex-1 py-4 rounded-2xl font-black text-lg border-2 border-b-[4px] ${isPracticeMode ? 'bg-[#d7ffb8] border-[#58a700] text-[#58a700]' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>🌱 LUYỆN TẬP</button>
             </div>
             
             <label className="btn-duo block w-full bg-[#58cc02] border-[#58a700] border-b-[4px] text-white py-5 rounded-2xl font-black text-xl text-center cursor-pointer hover:bg-[#46a302] mb-6">
                 TẢI LÊN FILE WORD (.DOCX)
                 <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} />
             </label>
             <button onClick={handleCreateDemo} className="font-bold text-[#1cb0f6] uppercase tracking-wider text-sm hover:underline">Dùng thử đề mẫu ngay</button>
          </div>
        )}

        {screen === 'edit' && !isGuestMode && (
          <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
             <div className="flex-1 bg-white rounded-3xl border-2 border-[#e5e5e5] p-6 sm:p-8">
               <div className="flex justify-between items-center mb-6 pb-6 border-b-2 border-[#e5e5e5]">
                 <h2 className="text-2xl font-black text-[#3c3c3c] flex items-center gap-3"><Edit3 size={28} className="text-[#1cb0f6]"/> Duyệt Đề</h2>
                 <span className="bg-[#ffc800] text-white px-4 py-1.5 rounded-xl font-black uppercase text-sm shadow-[0_3px_0_#e5b400]">{questions.length} câu</span>
               </div>
               
               <div className="space-y-6">
                 {questions.map((q, idx) => (
                   <div key={q.id} className="border-2 border-[#e5e5e5] rounded-2xl p-6 transition-colors hover:border-[#1cb0f6]">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                          <div className="font-bold text-[#4b4b4b] text-lg flex gap-2 leading-relaxed">
                             <span className="text-[#1cb0f6] font-black shrink-0">Câu {idx + 1}:</span>
                             <span dangerouslySetInnerHTML={{ __html: q.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />
                          </div>
                          <button onClick={() => { const newQs = [...questions]; newQs[idx].type = newQs[idx].type === 'single' ? 'group' : 'single'; setQuestions(newQs); }} className="btn-duo px-3 py-2 bg-[#ddf4ff] border-2 border-[#1cb0f6] border-b-[4px] text-[#1cb0f6] rounded-xl font-black text-xs uppercase tracking-wider shrink-0 whitespace-nowrap">
                              {q.type === 'single' ? 'Đổi dạng Đúng/Sai' : 'Đổi dạng Chọn 1'}
                          </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {q.options?.map(opt => (
                            <div key={opt.key} onClick={() => toggleCorrectAnswer(idx, opt.key)} className={`btn-duo p-3 rounded-xl border-2 border-b-[4px] cursor-pointer flex items-center gap-3 font-bold ${opt.isCorrect ? 'bg-[#d7ffb8] border-[#58a700] text-[#58a700]' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 ${opt.isCorrect ? 'bg-white border-[#58a700] text-[#58a700]' : 'bg-white border-[#e5e5e5]'}`}>{opt.key}</span>
                                <span className="text-[#4b4b4b]">{opt.text}</span>
                            </div>
                        ))}
                        {q.type === 'text' && <input type="text" value={q.correctAnswer} onChange={(e) => handleTextAnswerEdit(idx, e.target.value)} className="border-2 border-[#e5e5e5] rounded-xl p-3 w-full font-bold text-[#58a700] focus:border-[#1cb0f6] outline-none"/>}
                      </div>
                   </div>
                 ))}
               </div>
             </div>

             <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                <div className="bg-white rounded-3xl border-2 border-[#e5e5e5] p-6 text-center">
                    <h3 className="font-black text-xl mb-6 text-[#3c3c3c]">Chia Sẻ & Thi</h3>
                    <div className="flex items-center justify-center gap-3 mb-6 bg-[#f7f7f7] p-3 rounded-xl cursor-pointer" onClick={() => setShareAsPractice(!shareAsPractice)}>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${shareAsPractice ? 'bg-[#1cb0f6] border-[#1cb0f6]' : 'bg-white border-[#afafaf]'}`}>{shareAsPractice && <Check size={16} className="text-white" strokeWidth={4} />}</div>
                        <span className="text-sm font-bold text-[#4b4b4b]">Tạo link Luyện tập</span>
                    </div>
                     
                    {!shareLink ? (
                        <button onClick={handleCreateShareLink} className="btn-duo w-full bg-[#1cb0f6] text-white py-4 rounded-2xl border-2 border-[#1899d6] border-b-[4px] font-black uppercase tracking-wider mb-4">
                            {isLoading ? "Đang tạo..." : "TẠO LINK CHIA SẺ"}
                        </button>
                    ) : (
                        <div className="bg-[#ddf4ff] border-2 border-[#1cb0f6] p-4 rounded-2xl mb-4 text-left">
                            <div className="bg-white text-[#1cb0f6] p-2 rounded-lg font-bold text-xs truncate mb-3">{shareLink}</div>
                            <button onClick={copyToClipboard} className="btn-duo w-full bg-[#58cc02] border-[#58a700] border-b-[4px] text-white py-3 rounded-xl font-black uppercase text-sm">Sao chép Link</button>
                        </div>
                    )}
                    
                    <button onClick={() => startExamFinal(questions)} className="btn-duo w-full bg-[#ffc800] text-white py-4 rounded-2xl border-2 border-[#e5b400] border-b-[4px] font-black text-lg uppercase tracking-wider shadow-[0_4px_15px_rgba(255,200,0,0.4)]">
                        THI TRỰC TIẾP
                    </button>
                </div>

                <div className="bg-white rounded-3xl border-2 border-[#e5e5e5] p-6">
                    <div className="font-black text-[#3c3c3c] mb-4 flex items-center gap-2"><Type size={20}/> Sửa Key Nhanh</div>
                    <textarea className="w-full p-4 border-2 border-[#e5e5e5] rounded-2xl text-sm h-32 font-mono font-bold text-[#4b4b4b] focus:border-[#1cb0f6] outline-none mb-4 custom-scroll" placeholder="1A&#10;2B..." value={quickKeyInput} onChange={(e) => setQuickKeyInput(e.target.value)}></textarea>
                    <button onClick={applyQuickKeys} className="btn-duo w-full bg-[#f7f7f7] border-2 border-[#e5e5e5] border-b-[4px] text-[#afafaf] hover:text-[#4b4b4b] py-3 rounded-xl font-black uppercase">Cập nhật nhanh</button>
                </div>
             </div>
          </div>
        )}

        {screen === 'edit' && isGuestMode && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
                <div className="bg-white p-8 sm:p-10 rounded-3xl border-2 border-[#e5e5e5] text-center max-w-lg w-full shadow-lg">
                    <div className="w-24 h-24 mx-auto bg-[#ddf4ff] rounded-full flex items-center justify-center mb-6">
                        <BookOpen size={48} className="text-[#1cb0f6]"/>
                    </div>
                    <h2 className="text-3xl font-black text-[#3c3c3c] mb-4 leading-tight">{examName}</h2>
                    <div className="flex justify-center gap-3 mb-10">
                        <span className="px-4 py-1.5 bg-[#f7f7f7] rounded-xl text-sm font-black text-[#afafaf] border-2 border-[#e5e5e5] uppercase">{questions.length} câu hỏi</span>
                        <span className={`px-4 py-1.5 rounded-xl text-sm font-black uppercase border-2 ${isPracticeMode ? 'bg-[#d7ffb8] text-[#58a700] border-[#58a700]' : 'bg-[#ddf4ff] text-[#1cb0f6] border-[#1cb0f6]'}`}>{isPracticeMode ? 'Luyện Tập' : 'Thi Thử'}</span>
                    </div>
                    <button onClick={() => startExamFinal(questions)} className="btn-duo w-full bg-[#58cc02] border-[#58a700] border-b-[4px] text-white py-5 rounded-2xl font-black text-2xl uppercase tracking-widest hover:bg-[#46a302]">
                        BẮT ĐẦU NGAY
                    </button>
                </div>
            </div>
        )}

        {/* THAY ĐỔI LỚN 3: Cấu trúc Layout Màn hình Thi chống tràn */}
        {screen === 'exam' && currentQ && (
            <div className="flex-1 flex flex-col lg:flex-row max-w-6xl w-full mx-auto p-0 sm:p-5 gap-0 sm:gap-6 min-h-0 overflow-hidden relative">
                
                {/* OVERLAY MAP TRÊN MOBILE (Cuộn được độc lập) */}
                {showQuestionGrid && (
                    <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col p-5 animate-fade-in lg:hidden">
                        <div className="flex justify-between items-center mb-6 pt-2 shrink-0">
                            <h3 className="font-black text-2xl text-[#3c3c3c]">Bản Đồ Câu Hỏi</h3>
                            <button onClick={() => setShowQuestionGrid(false)} className="btn-duo w-12 h-12 bg-white rounded-2xl border-2 border-[#e5e5e5] border-b-[4px] text-[#afafaf] flex items-center justify-center font-black"><X size={24}/></button>
                        </div>
                        {/* Khu vực chứa lưới câu hỏi cuộn được */}
                        <div className="flex-1 overflow-y-auto custom-scroll flex flex-wrap gap-3 content-start pb-6 min-h-0">
                            {questions.map((q, idx) => {
                                const isDone = checkedQuestions[q.id] || userAnswers[q.id] !== undefined, isError = checkError === q.id, isCurrent = idx === currentQuestionIndex;
                                let style = "bg-white border-[#e5e5e5] text-[#afafaf] border-b-[4px]";
                                if (isCurrent) style = "bg-[#1cb0f6] border-[#1899d6] text-white border-b-[4px]";
                                else if (isDone) style = "bg-[#ddf4ff] border-[#1cb0f6] text-[#1cb0f6] border-b-[4px]";
                                return <button key={q.id} onClick={() => { setCurrentQuestionIndex(idx); setShowQuestionGrid(false); }} className={`btn-duo w-14 h-14 rounded-2xl border-2 font-black text-lg flex items-center justify-center ${style}`}>{idx + 1}</button>
                            })}
                        </div>
                        <button onClick={() => {setShowQuestionGrid(false); handleSubmit();}} className="btn-duo w-full shrink-0 mt-4 bg-[#ff4b4b] border-[#ea2b2b] border-b-[4px] text-white py-5 rounded-2xl font-black text-xl uppercase tracking-wider">NỘP BÀI NGAY</button>
                    </div>
                )}

                {/* CỘT TRÁI: Khu vực Câu Hỏi (Cuộn độc lập) */}
                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-3xl sm:border-2 sm:border-[#e5e5e5] p-4 sm:p-6 pb-20 sm:pb-6">
                    {/* Header câu hỏi */}
                    <div className="flex items-center gap-3 mb-4 sm:mb-6 shrink-0">
                        <div className="px-4 py-2 bg-[#ffc800] text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-[0_3px_0_#e5b400]">Câu {currentQuestionIndex + 1}</div>
                        <span className="font-bold text-[#afafaf] text-sm uppercase hidden sm:block">| {currentQ.type === 'single' ? 'Trắc nghiệm một lựa chọn' : currentQ.type === 'group' ? 'Trắc nghiệm đúng/sai' : 'Trả lời ngắn'}</span>
                    </div>

                    {/* VÙNG CUỘN ĐƯỢC CHỨA CÂU HỎI VÀ ĐÁP ÁN */}
                    <div className="flex-1 overflow-y-auto custom-scroll pr-1 sm:pr-3 pb-4 min-h-0">
                        <div className="text-[#3c3c3c] text-xl sm:text-[22px] font-black leading-relaxed mb-6 [&>img]:rounded-2xl [&>img]:my-4 [&>img]:shadow-md [&>img]:border-2 [&>img]:border-[#e5e5e5]" dangerouslySetInnerHTML={{ __html: currentQ.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />
                        
                        {/* Banner Luyện Tập */}
                        {isPracticeMode && checkedQuestions[currentQ.id] && (<div className="mb-6 p-4 bg-[#d7ffb8] border-2 border-[#58a700] rounded-2xl flex items-center gap-4 animate-bounce"><div className="w-12 h-12 bg-[#58cc02] rounded-full flex items-center justify-center text-white shrink-0"><Check size={28} strokeWidth={3}/></div><h4 className="font-black text-[#58a700] text-xl">Tuyệt vời! Chính xác.</h4></div>)}
                        {checkError === currentQ.id && (<div className="mb-6 p-4 bg-[#ffdfe0] border-2 border-[#ea2b2b] rounded-2xl flex items-center gap-4 animate-pulse"><div className="w-12 h-12 bg-[#ff4b4b] rounded-full flex items-center justify-center text-white shrink-0"><X size={28} strokeWidth={3}/></div><h4 className="font-black text-[#ea2b2b] text-xl">Chưa đúng! Thử lại nào.</h4></div>)}

                        {/* Đáp án */}
                        <div className="flex flex-col gap-4 pb-2">
                            {currentQ.type === 'single' && currentQ.options?.map((opt) => {
                                const uAns = userAnswers[currentQ.id], isChecked = isPracticeMode && checkedQuestions[currentQ.id], isError = checkError === currentQ.id, isSelected = uAns === opt.key;
                                let wrapperStyle = "bg-white border-[#e5e5e5] text-[#4b4b4b] border-b-[4px] hover:bg-[#f7f7f7]";
                                let boxStyle = "border-[#e5e5e5] text-[#afafaf] bg-white";
                                if (isChecked) { if (opt.isCorrect) { wrapperStyle = "bg-[#d7ffb8] border-[#58a700] border-b-[4px] text-[#58a700]"; boxStyle = "bg-white border-[#58a700] text-[#58a700]"; } else if (isSelected) { wrapperStyle = "bg-gray-100 border-[#e5e5e5] opacity-50"; boxStyle = "bg-white border-[#e5e5e5]"; } else { wrapperStyle = "bg-white border-[#e5e5e5] opacity-30"; boxStyle = "bg-white border-[#e5e5e5]"; } } 
                                else if (isError && isSelected) { wrapperStyle = "bg-[#ffdfe0] border-[#ea2b2b] border-b-[4px] text-[#ea2b2b]"; boxStyle = "bg-white border-[#ea2b2b] text-[#ea2b2b]"; } 
                                else if (isSelected) { wrapperStyle = "bg-[#ddf4ff] border-[#1cb0f6] border-b-[4px] text-[#1cb0f6]"; boxStyle = "bg-white border-[#1cb0f6] text-[#1cb0f6]"; }
                                return <div key={opt.key} onClick={() => handleAnswerChange(currentQ.id, opt.key, 'single')} className={`btn-duo w-full p-4 rounded-2xl border-2 font-bold text-lg cursor-pointer flex items-center gap-4 ${wrapperStyle}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 font-black text-lg shrink-0 ${boxStyle}`}>{opt.key}</div><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt.text }}></div></div>
                            })}
                            {currentQ.type === 'group' && currentQ.options?.map((opt) => (
                                <div key={opt.key} className="p-4 sm:p-5 border-2 border-[#e5e5e5] border-b-[4px] rounded-2xl bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-[#f7f7f7] transition-colors"><div className="font-bold text-[#4b4b4b] text-lg flex-1"><span className="font-black text-[#1cb0f6] mr-2">{opt.key}.</span><span dangerouslySetInnerHTML={{ __html: opt.text }}></span></div><div className="flex gap-3 shrink-0">
                                    {['ĐÚNG', 'SAI'].map((label, i) => {
                                        const val = i === 0, myChoice = userAnswers[currentQ.id]?.[opt.key], isLocked = isPracticeMode && checkedQuestions[currentQ.id];
                                        const isActive = myChoice === val;
                                        const btnStyle = isActive ? (val ? 'bg-[#1cb0f6] border-[#1899d6] border-b-[4px] text-white' : 'bg-[#ff4b4b] border-[#ea2b2b] border-b-[4px] text-white') : 'bg-white border-[#e5e5e5] border-b-[4px] text-[#afafaf] hover:bg-[#f7f7f7]';
                                        return <button key={label} onClick={() => !isLocked && handleAnswerChange(currentQ.id, val, 'group', opt.key)} className={`btn-duo px-6 py-3 rounded-xl border-2 font-black text-sm uppercase tracking-wider ${btnStyle}`}>{label}</button>
                                    })}
                                </div></div>
                            ))}
                            {currentQ.type === 'text' && <input type="text" placeholder="Nhập đáp án..." className="w-full p-5 text-xl bg-white border-2 border-[#e5e5e5] border-b-[4px] rounded-2xl text-[#3c3c3c] font-black outline-none focus:border-[#1cb0f6] transition-all" value={userAnswers[currentQ.id] || ''} onChange={(e) => handleAnswerChange(currentQ.id, e.target.value, 'text')} />}
                        </div>
                    </div>

                    {/* Thanh Điều Hướng Dưới (Chỉ hiện trên PC) */}
                    <div className="hidden lg:flex shrink-0 justify-between items-center pt-4 mt-2 border-t-2 border-[#e5e5e5]">
                        <button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className={`btn-duo px-8 py-3 rounded-2xl border-2 border-b-[4px] font-black uppercase tracking-wider text-lg ${currentQuestionIndex === 0 ? 'bg-[#f7f7f7] border-[#e5e5e5] text-[#afafaf] cursor-not-allowed opacity-50' : 'bg-white border-[#e5e5e5] text-[#afafaf] hover:bg-[#f7f7f7]'}`}>TRỞ LẠI</button>
                        {isPracticeMode ? (
                            <button onClick={() => handleCheckQuestion(currentQ.id)} className={`btn-duo px-10 py-3 rounded-2xl border-2 border-b-[4px] font-black uppercase tracking-wider text-lg text-white ${checkError === currentQ.id ? 'bg-[#ffc800] border-[#e5b400]' : 'bg-[#58cc02] border-[#58a700] hover:bg-[#46a302]'}`}>{checkError === currentQ.id ? 'THỬ LẠI' : 'KIỂM TRA'}</button>
                        ) : (
                            <button onClick={handleNextQuestion} className="btn-duo px-10 py-3 rounded-2xl border-2 border-[#1cb0f6] border-b-[4px] bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-black uppercase tracking-wider text-lg">TIẾP THEO</button>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: Đồng hồ & Map Câu Hỏi (Ẩn/Hiện trên PC) */}
                {isSidebarOpen && (
                    <div className="w-[280px] lg:w-[320px] hidden lg:flex flex-col gap-5 shrink-0 min-h-0">
                        {/* Đồng hồ */}
                        {!isPracticeMode && (
                            <div className="shrink-0 bg-white p-5 rounded-3xl border-2 border-[#e5e5e5] border-b-[4px] flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="text-[#afafaf] font-black uppercase tracking-widest text-xs mb-1 z-10">THỜI GIAN CÒN LẠI</div>
                                <div className="text-[#ff4b4b] font-black text-4xl tracking-tight z-10 leading-none">{formatTime(timeLeft)}</div>
                                <Clock className="absolute -right-3 -bottom-3 text-[#e5e5e5] w-20 h-20 opacity-50" />
                            </div>
                        )}

                        {/* Bản đồ câu hỏi (Cuộn độc lập) */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white p-5 rounded-3xl border-2 border-[#e5e5e5] border-b-[4px]">
                            <div className="font-black text-[#3c3c3c] text-lg mb-4 uppercase tracking-wider shrink-0 flex justify-between items-center">
                                MỤC LỤC CÂU HỎI
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scroll flex flex-wrap gap-2 content-start pr-1 min-h-0">
                                {questions.map((q, idx) => {
                                    const isDone = checkedQuestions[q.id] || userAnswers[q.id] !== undefined, isCurrent = idx === currentQuestionIndex;
                                    let style = "bg-white border-[#e5e5e5] text-[#afafaf] border-b-[4px] hover:bg-[#f7f7f7]";
                                    if (isCurrent) style = "bg-[#1cb0f6] border-[#1899d6] text-white border-b-[4px]";
                                    else if (isDone) style = "bg-[#ddf4ff] border-[#1cb0f6] text-[#1cb0f6] border-b-[4px]";
                                    return <button key={q.id} onClick={() => setCurrentQuestionIndex(idx)} className={`btn-duo w-[46px] h-[46px] rounded-xl border-2 font-black text-sm flex items-center justify-center ${style}`}>{idx + 1}</button>
                                })}
                            </div>

                            <button onClick={handleSubmit} className="shrink-0 btn-duo w-full mt-4 py-3.5 rounded-xl border-2 border-[#ea2b2b] border-b-[4px] bg-[#ff4b4b] hover:bg-[#e63939] text-white font-black text-[17px] uppercase tracking-wider">
                                NỘP BÀI THI
                            </button>
                        </div>
                    </div>
                )}

                {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG CHO MOBILE */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 p-3 bg-white border-t-2 border-[#e5e5e5] z-50 flex gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className="btn-duo w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border-2 border-[#e5e5e5] border-b-[4px] bg-white text-[#afafaf] font-black disabled:opacity-50"><ChevronLeft size={24} strokeWidth={3}/></button>
                    
                    {isPracticeMode ? (
                        <button onClick={() => handleCheckQuestion(currentQ.id)} className={`btn-duo flex-1 rounded-xl border-2 border-b-[4px] text-white font-black text-[15px] uppercase tracking-wider ${checkError === currentQ.id ? 'bg-[#ffc800] border-[#e5b400]' : 'bg-[#58cc02] border-[#58a700]'}`}>{checkError === currentQ.id ? 'THỬ LẠI' : 'KIỂM TRA'}</button>
                    ) : (
                        <div className="flex-1 rounded-xl border-2 border-[#e5e5e5] border-b-[4px] bg-white flex flex-col items-center justify-center py-1 shadow-inner">
                            <span className="text-[9px] font-black text-[#afafaf] uppercase tracking-widest leading-none mb-0.5">Thời Gian</span>
                            <span className="text-[17px] font-black text-[#ff4b4b] leading-none">{formatTime(timeLeft)}</span>
                        </div>
                    )}

                    <button onClick={currentQuestionIndex < questions.length - 1 ? handleNextQuestion : handleSubmit} className={`btn-duo w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border-2 border-b-[4px] font-black text-white ${currentQuestionIndex < questions.length - 1 ? 'bg-[#1cb0f6] border-[#1899d6]' : 'bg-[#ff4b4b] border-[#ea2b2b]'}`}>{currentQuestionIndex < questions.length - 1 ? <ChevronRight size={24} strokeWidth={3}/> : <Check size={24} strokeWidth={3}/>}</button>
                </div>
            </div>
        )}

        {/* --- MÀN HÌNH KẾT QUẢ --- */}
        {screen === 'result' && scoreData && (
            <div className="w-full max-w-4xl p-4 sm:p-6 pb-24 mx-auto animate-fade-in-up">
                
                {/* Bảng điểm tổng kết */}
                <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border-2 border-[#e5e5e5] border-b-[8px] text-center shadow-sm mb-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-4 bg-[#ffc800]"></div>
                    <div className="w-28 h-28 bg-[#fff4c2] border-4 border-[#ffc800] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_6px_0_#e5b400] relative">
                        <Trophy size={56} className="text-[#ffc800]"/>
                        <div className="absolute -right-2 -bottom-2 bg-[#58cc02] border-4 border-white text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">!</div>
                    </div>
                    <h2 className="text-[72px] font-black text-[#ffc800] mb-0 leading-none tracking-tighter drop-shadow-sm">{scoreData.score}</h2>
                    <p className="text-[#afafaf] mb-10 font-black uppercase tracking-[0.3em] text-sm">ĐIỂM TỔNG KẾT</p>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                        <div className="bg-[#d7ffb8] p-5 rounded-3xl border-2 border-[#58a700] border-b-[6px] text-[#58a700] flex flex-col items-center">
                            <span className="text-4xl font-black mb-1">{scoreData.correctCount}</span>
                            <span className="text-xs uppercase font-black tracking-widest opacity-80">CÂU ĐÚNG</span>
                        </div>
                        <div className="bg-[#ffdfe0] p-5 rounded-3xl border-2 border-[#ea2b2b] border-b-[6px] text-[#ea2b2b] flex flex-col items-center">
                            <span className="text-4xl font-black mb-1">{scoreData.total - scoreData.correctCount}</span>
                            <span className="text-xs uppercase font-black tracking-widest opacity-80">CÂU SAI</span>
                        </div>
                    </div>
                    <button onClick={() => startExamFinal(questions, false)} className="btn-duo max-w-xs w-full mx-auto bg-[#1cb0f6] text-white py-4 rounded-2xl border-2 border-[#1899d6] border-b-[6px] font-black text-xl uppercase tracking-wider block">THỬ LẠI NGAY</button>
                </div>

                {/* Bảng Chi Tiết Từng Câu Hỏi */}
                <h3 className="text-2xl font-black text-[#3c3c3c] mb-6 flex items-center gap-3"><List className="text-[#1cb0f6]" strokeWidth={3}/> BẢN BÁO CÁO CHI TIẾT</h3>
                
                <div className="space-y-6">
                    {questions.map((q, idx) => {
                        const uAns = userAnswers[q.id];
                        const questionContent = <div className="text-[#4b4b4b] font-bold mb-6 text-lg leading-relaxed bg-[#f7f7f7] p-5 rounded-2xl border-2 border-[#e5e5e5] [&>img]:rounded-xl [&>img]:my-3" dangerouslySetInnerHTML={{ __html: q.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />;

                        if (q.type === 'single') {
                            const isCorrect = q.options?.find(o => o.isCorrect)?.key === uAns;
                            return (
                                <div key={q.id} className={`p-6 sm:p-8 rounded-[2rem] border-2 border-b-[6px] bg-white ${isCorrect ? 'border-[#58a700]' : 'border-[#ea2b2b]'}`}>
                                    <div className={`font-black flex items-center gap-3 pb-4 mb-4 border-b-2 border-[#e5e5e5] text-xl ${isCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>
                                        {isCorrect ? <CheckCircle2 size={28} strokeWidth={3}/> : <XCircle size={28} strokeWidth={3}/>}
                                        CÂU SỐ {idx + 1}
                                    </div>
                                    {questionContent}
                                    <div className="grid grid-cols-1 gap-3 mt-4">
                                        {q.options?.map(opt => {
                                            const isSelected = uAns === opt.key;
                                            const isOptCorrect = opt.isCorrect;
                                            let wrapperStyle = "bg-white border-[#e5e5e5] opacity-50"; 
                                            let keyStyle = "bg-white border-[#e5e5e5] text-[#afafaf]";
                                            let textStyle = "text-[#afafaf]";
                                            if (isOptCorrect) { wrapperStyle = "bg-[#d7ffb8] border-[#58a700] border-b-[4px] opacity-100"; keyStyle = "bg-white border-[#58a700] text-[#58a700]"; textStyle = "text-[#58a700] font-black"; } 
                                            else if (isSelected && !isOptCorrect) { wrapperStyle = "bg-[#ffdfe0] border-[#ea2b2b] border-b-[4px] opacity-100"; keyStyle = "bg-white border-[#ea2b2b] text-[#ea2b2b]"; textStyle = "text-[#ea2b2b] font-black"; }
                                            return (
                                                <div key={opt.key} className={`flex items-center p-4 rounded-2xl border-2 transition-all ${wrapperStyle}`}>
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg mr-4 shrink-0 border-2 ${keyStyle}`}>{opt.key}</div>
                                                    <div className={`flex-1 text-[17px] font-bold ${textStyle}`} dangerouslySetInnerHTML={{ __html: opt.text }} />
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
                                <div key={q.id} className={`p-6 sm:p-8 rounded-[2rem] border-2 border-b-[6px] bg-white ${isCorrect ? 'border-[#58a700]' : 'border-[#ea2b2b]'}`}>
                                    <div className={`font-black flex items-center gap-3 pb-4 mb-4 border-b-2 border-[#e5e5e5] text-xl ${isCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>
                                        {isCorrect ? <CheckCircle2 size={28} strokeWidth={3}/> : <XCircle size={28} strokeWidth={3}/>} CÂU SỐ {idx + 1}
                                    </div>
                                    {questionContent}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        <div className="bg-[#f7f7f7] p-5 rounded-2xl border-2 border-[#e5e5e5]">
                                            <div className="text-[12px] font-black text-[#afafaf] uppercase tracking-widest mb-2">ĐÁP ÁN BẠN NHẬP</div>
                                            <div className={`text-xl font-black ${isCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>{uAns || "Trống"}</div>
                                        </div>
                                        <div className="bg-[#ddf4ff] p-5 rounded-2xl border-2 border-[#1cb0f6]">
                                            <div className="text-[12px] font-black text-[#1cb0f6] uppercase tracking-widest mb-2">ĐÁP ÁN ĐÚNG</div>
                                            <div className="text-xl font-black text-[#1cb0f6]">{q.correctAnswer || "Chưa cấu hình"}</div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        if (q.type === 'group') {
                            return (
                                <div key={q.id} className="p-6 sm:p-8 rounded-[2rem] border-2 border-b-[6px] bg-white border-[#1cb0f6]">
                                    <div className="font-black flex items-center gap-3 pb-4 mb-4 border-b-2 border-[#e5e5e5] text-xl text-[#1cb0f6]">
                                        <List size={28} strokeWidth={3}/> CÂU SỐ {idx + 1} (ĐÚNG/SAI)
                                    </div>
                                    {questionContent}
                                    <div className="grid grid-cols-1 gap-3 mt-4">
                                        {q.options?.map(opt => {
                                            const myChoice = uAns ? uAns[opt.key] : undefined, subCorrect = myChoice === opt.isCorrect;
                                            return (
                                                <div key={opt.key} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border-2 border-b-[4px] gap-4 ${subCorrect ? 'bg-[#d7ffb8] border-[#58a700]' : 'bg-[#ffdfe0] border-[#ea2b2b]'}`}>
                                                    <span className={`text-[17px] flex-1 flex gap-3 font-bold ${subCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>
                                                        <span className="font-black">{opt.key}.</span> <span dangerouslySetInnerHTML={{ __html: opt.text }}/>
                                                    </span>
                                                    <div className="flex gap-3 text-sm shrink-0 w-full sm:w-auto">
                                                        <div className="flex-1 sm:flex-none bg-white px-4 py-2 rounded-xl text-center border-2 border-[#e5e5e5]">
                                                            <span className="text-[#afafaf] text-[10px] font-black uppercase tracking-widest block mb-1">BẠN CHỌN</span>
                                                            <span className={`font-black ${subCorrect ? 'text-[#58a700]' : 'text-[#ea2b2b]'}`}>{myChoice === true ? 'ĐÚNG' : myChoice === false ? 'SAI' : 'TRỐNG'}</span>
                                                        </div>
                                                        <div className="flex-1 sm:flex-none bg-white px-4 py-2 rounded-xl text-center border-2 border-[#e5e5e5]">
                                                            <span className="text-[#afafaf] text-[10px] font-black uppercase tracking-widest block mb-1">ĐÁP ÁN ĐÚNG</span>
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
