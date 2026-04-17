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
// Nhớ đổi chữ PROJECT_ID thành mã dự án của bạn nhé! (Tuyệt đối không xóa chữ /exams ở cuối)
const FIREBASE_URL = "https://azotahung-default-rtdb.asia-southeast1.firebasedatabase.app/exams"; 

// --- SOUND ASSETS ---
const SOUNDS = {
    click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    success: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
    error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shareLink, setShareLink] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [shareAsPractice, setShareAsPractice] = useState(false); 
  const [isGuestMode, setIsGuestMode] = useState(false); 
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

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

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  useEffect(() => {
      if (scrollRef.current) {
          const activeBtn = scrollRef.current.querySelector('.active-q-btn');
          if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
  }, [currentQuestionIndex]);

  useEffect(() => { if (window.innerWidth > 1024) setIsSidebarOpen(true); }, []);

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
          return alert("Bạn chưa cập nhật link FIREBASE_URL ở dòng 14!");
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

  const handleNextQuestion = () => { if (currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); window.scrollTo(0, 0); } };
  const handlePrevQuestion = () => { if (currentQuestionIndex > 0) { setCurrentQuestionIndex(prev => prev - 1); window.scrollTo(0, 0); } };
  
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
    const groupKeywords = /Đúng hay Sai|đúng sai|nhận định|mệnh đề/i;

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
      
      // Hợp nhất Regex: Nhận diện chung cho cả ABCD và abcd
      const optMatch = text.match(/^([a-dA-D])[\.\)\/]\s*(.*)/);
      
      let isNewQuestion = false;
      if (isStrongStart && !optMatch) isNewQuestion = true; 
      else if (isWeakStart && !optMatch) {
          if (currentQuestion && (!currentQuestion.options || currentQuestion.options.length === 0)) isNewQuestion = false; 
          else isNewQuestion = true;
      }

      if (isNewQuestion) {
        if (currentQuestion) parsedQuestions.push(currentQuestion);
        currentQuestion = { id: parsedQuestions.length + 1, question: text || htmlContent, type: 'single', options: [], correctAnswer: "" };
        if (groupKeywords.test(text)) currentQuestion.type = 'group'; // Tạm đoán là group nếu có từ khóa
        return; 
      }
      if (!currentQuestion) return;
      
      const shortMatch = text.match(shortAnswerRegex);
      if (shortMatch) { currentQuestion.type = 'text'; currentQuestion.correctAnswer = shortMatch[2].trim(); currentQuestion.options = []; return; }
      
      if (optMatch) {
          const letter = optMatch[1];
          const content = optMatch[2];
          const isUpperCase = letter === letter.toUpperCase();
          
          // QUAN TRỌNG NHẤT: Chữ cái Option ĐẦU TIÊN (Hoa hay thường) sẽ chốt luôn loại câu hỏi, vô hiệu hóa mọi từ khóa gây nhiễu!
          if (currentQuestion.options.length === 0) {
              currentQuestion.type = isUpperCase ? 'single' : 'group';
          }
          
          // Ép key theo chuẩn form
          const finalKey = currentQuestion.type === 'group' ? letter.toLowerCase() : letter.toUpperCase();
          
          // Giữ lại định dạng HTML/Ảnh trong đáp án
          let cleanHtml = htmlContent;
          if(cleanHtml.startsWith(letter)) {
              cleanHtml = cleanHtml.replace(/^([a-dA-D])[\.\)\/]\s*/i, '');
          } else {
              cleanHtml = content; 
          }
          
          currentQuestion.options.push({ key: finalKey, text: cleanHtml, isCorrect: isMarkedCorrect }); 
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
  const toggleCorrectAnswer = (qIndex, optKey) => { const newQuestions = [...questions]; const q = newQuestions[qIndex]; if (q.type === 'single') q.options?.forEach(opt => opt.isCorrect = (opt.key === optKey)); else if (q.type === 'group') { const opt = q.options?.find(o => o.key === optKey); if (opt) opt.isCorrect = !opt.isCorrect; } setQuestions(newQuestions); };

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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const isExamMode = screen === 'exam' || screen === 'result';
  const containerClass = isExamMode ? "min-h-screen font-sans text-gray-100 bg-[#09090b] selection:bg-cyan-500 selection:text-white" : "min-h-screen font-sans text-gray-800 bg-[#f3f4f6]";
  const headerClass = isExamMode ? "fixed top-0 left-0 right-0 z-50 h-16 px-4 flex justify-between items-center backdrop-blur-xl bg-black/40 border-b border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]" : "fixed top-0 left-0 right-0 z-50 h-16 px-4 flex justify-between items-center bg-white border-b border-gray-200 shadow-sm";

  // Biến bảo vệ cho giao diện làm bài
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className={containerClass}>
      <header className={headerClass}>
        <div className="flex items-center gap-4">
            {screen === 'exam' ? (
                <button onClick={() => { if(confirm("Thoát bài thi?")) setScreen('upload'); }} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${isExamMode ? 'text-cyan-400 hover:text-white hover:bg-white/10 border-white/5' : 'text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                    <ChevronLeft size={20}/> <span className="hidden sm:inline font-bold">Thoát</span>
                </button>
            ) : (
                <div className={`flex items-center gap-2 font-bold text-lg cursor-pointer ${isGuestMode ? '' : 'hover:opacity-80'}`} onClick={() => !isGuestMode && setScreen('upload')}>
                    <div className="w-9 h-9 bg-blue-600 text-white flex items-center justify-center rounded-lg shadow-md">A</div> 
                    <span className={isExamMode ? "text-white" : "text-gray-700"}>Azota Ultra</span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-3">
            {installPrompt && (
                <button onClick={handleInstallApp} className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-bold text-xs shadow-lg animate-pulse hover:scale-105 transition-transform"><Download size={14}/> CÀI APP</button>
            )}
            {screen === 'exam' && (
                <>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5">{isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
                    <div className="flex items-center gap-2 text-cyan-300 bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                        <Clock size={16}/><span className="font-mono font-bold">{isPracticeMode ? "∞" : formatTime(timeLeft)}</span>
                    </div>
                    <button onClick={() => { if(confirm("Làm lại từ đầu?")) startExamFinal(questions); }} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"><RotateCcw size={18}/></button>
                </>
            )}
            {!isGuestMode && screen !== 'exam' && screen !== 'upload' && (<button onClick={() => setScreen('upload')} className="text-gray-500 font-bold text-sm">Trang chủ</button>)}
        </div>
      </header>

      <main className="pt-24 pb-32 px-4 h-screen overflow-y-auto no-scrollbar">
        {screen === 'upload' && !isGuestMode && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in-up">
             <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600"><Upload size={40} /></div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Tạo & Chia Sẻ Đề</h2>
                <p className="text-gray-500 mb-8 text-sm flex items-center justify-center gap-2">Upload đề thi (Word) <ArrowRight size={14}/> Lấy Link <ArrowRight size={14}/> Gửi bạn bè.</p>
                <div className="flex gap-3 mb-6 justify-center">
                   <button onClick={() => setIsPracticeMode(false)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${!isPracticeMode ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500'}`}>🔥 Thi Thử</button>
                   <button onClick={() => setIsPracticeMode(true)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${isPracticeMode ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-500'}`}>🌱 Luyện Tập</button>
                </div>
                <label className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg cursor-pointer hover:scale-[1.02] transition-transform mb-4">
                    <div className="flex items-center justify-center gap-2"><FileText size={20} /> Tải file Word</div>
                    <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} />
                </label>
                <button onClick={handleCreateDemo} className="text-indigo-600 font-bold text-sm hover:underline">Dùng thử đề mẫu</button>
             </div>
          </div>
        )}

        {screen === 'edit' && !isGuestMode && (
          <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
             <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
               <div className="flex justify-between items-center mb-4 pb-4 border-b">
                 <h2 className="text-lg font-bold text-gray-800 flex gap-2"><Edit3 size={20} className="text-indigo-500"/> Duyệt Đề</h2>
                 <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{questions.length} câu</span>
               </div>
               <div className="space-y-6">
                 {questions.map((q, idx) => (
                   <div key={q.id} className="border rounded-xl p-4 hover:border-indigo-300 transition-colors">
                      <div className="font-bold text-gray-800 mb-3 flex gap-2">
                         <span className="text-indigo-600">Câu {idx + 1}:</span>
                         <span dangerouslySetInnerHTML={{ __html: q.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {q.options?.map(opt => (
                            <div key={opt.key} onClick={() => toggleCorrectAnswer(idx, opt.key)} className={`p-2 rounded border cursor-pointer flex items-center gap-2 ${opt.isCorrect ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'hover:bg-gray-50'}`}>
                                <span className={`w-5 h-5 flex items-center justify-center rounded border text-xs ${opt.isCorrect ? 'bg-green-500 text-white border-green-500' : 'bg-white'}`}>{opt.key}</span>{opt.text}
                            </div>
                        ))}
                        {q.type === 'text' && <input type="text" value={q.correctAnswer} onChange={(e) => handleTextAnswerEdit(idx, e.target.value)} className="border rounded p-2 w-full font-bold text-green-700"/>}
                      </div>
                   </div>
                 ))}
               </div>
             </div>
             <div className="lg:w-80 flex flex-col gap-4">
                <div className="bg-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                    <h3 className="font-bold text-xl mb-4 text-center">Chia Sẻ & Thi</h3>
                    <div className="mb-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2 bg-white/20 p-2 rounded-lg cursor-pointer hover:bg-white/30 transition-all" onClick={() => setShareAsPractice(!shareAsPractice)}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${shareAsPractice ? 'bg-green-400 border-green-400' : 'border-white/50'}`}>{shareAsPractice && <Check size={14} className="text-white" strokeWidth={3} />}</div>
                            <span className="text-sm font-bold text-white/90">Link cho Luyện tập</span>
                        </div>
                         {!shareLink ? (
                            <button onClick={handleCreateShareLink} className="w-full bg-white text-indigo-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 mb-3">
                                {isLoading ? "Đang tạo..." : <><Cloud size={18}/> Tạo Link Ngay</>}
                            </button>
                        ) : (
                            <div className="bg-white/20 p-3 rounded-xl mb-3"><div className="bg-white text-indigo-900 p-2 rounded text-xs truncate mb-2">{shareLink}</div><button onClick={copyToClipboard} className="w-full bg-green-400 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm">Sao chép</button></div>
                        )}
                    </div>
                    <button onClick={() => startExamFinal(questions)} className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg animate-pulse"><Play size={20}/> VÀO THI NGAY</button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                    <div className="font-bold text-gray-700 mb-2 flex gap-2"><MousePointerClick size={18}/> Sửa Key Nhanh</div>
                    <textarea className="w-full p-2 border rounded-lg text-sm h-24 font-mono mb-2" placeholder="1A&#10;2B..." value={quickKeyInput} onChange={(e) => setQuickKeyInput(e.target.value)}></textarea>
                    <button onClick={applyQuickKeys} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-sm">Cập nhật</button>
                </div>
             </div>
          </div>
        )}

        {screen === 'edit' && isGuestMode && (
            <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in-up">
                <div className="bg-[#18181b] p-8 rounded-3xl border border-white/10 shadow-2xl text-center max-w-md w-full relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{examName}</h2>
                    <div className="flex justify-center gap-4 mb-8">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-gray-400 border border-white/5">{questions.length} câu hỏi</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isPracticeMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{isPracticeMode ? 'Luyện Tập' : 'Thi Thử'}</span>
                    </div>
                    <button onClick={() => startExamFinal(questions)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-3"><Play size={24} fill="currentColor"/> VÀO THI NGAY</button>
                </div>
            </div>
        )}

        {screen === 'exam' && currentQ && (
            <div className="max-w-2xl mx-auto relative mt-4">
                {showQuestionGrid && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowQuestionGrid(false)}>
                        <div className="bg-[#18181b] w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2"><Grid size={18} className="text-cyan-400"/> Map Câu Hỏi</h3>
                                <button onClick={() => setShowQuestionGrid(false)} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            <div className="grid grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {questions.map((q, idx) => {
                                    const isDone = checkedQuestions[q.id], isError = checkError === q.id, isCurrent = idx === currentQuestionIndex;
                                    let style = "bg-white/5 text-gray-400 border-transparent hover:bg-white/10";
                                    if (isCurrent) style = "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] border-indigo-400 scale-110";
                                    else if (isDone) style = "bg-green-500/20 text-green-400 border-green-500/30";
                                    else if (isError) style = "bg-red-500/20 text-red-400 border-red-500/30";
                                    return <button key={q.id} onClick={() => { setCurrentQuestionIndex(idx); setShowQuestionGrid(false); }} className={`h-10 rounded-lg border flex items-center justify-center text-sm font-bold transition-all ${style}`}>{idx + 1}</button>
                                })}
                            </div>
                            <button onClick={handleSubmit} className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-bold transition-all">NỘP BÀI NGAY</button>
                        </div>
                    </div>
                )}
                <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[500px] flex flex-col relative transition-all duration-500">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70"></div>
                    <div className="p-6 sm:p-8 pb-2">
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">Câu {currentQuestionIndex + 1}</div>
                            {isPracticeMode && checkedQuestions[currentQ.id] && <div className="text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20"><CheckCircle2 size={12}/> Xong</div>}
                        </div>
                        <div className="text-white text-lg sm:text-2xl font-medium leading-relaxed [&>img]:rounded-xl [&>img]:my-2 [&>img]:shadow-lg" dangerouslySetInnerHTML={{ __html: currentQ.question?.replace(/^(Câu)?\s*\d+[\.:]\s*/i, '') || '' }} />
                    </div>
                    <div className="flex items-center gap-4 px-8 py-4"><div className="h-px bg-white/5 flex-1"></div><span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Select Answer</span><div className="h-px bg-white/5 flex-1"></div></div>
                    <div className="px-6 sm:px-8 pb-24 flex-1">
                        {isPracticeMode && checkedQuestions[currentQ.id] && (<div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 animate-bounce shadow-[0_0_20px_rgba(16,185,129,0.2)]"><div className="p-2 bg-emerald-500/20 rounded-full text-emerald-400"><Check size={20}/></div><div><h4 className="font-bold text-emerald-300">Chính xác! Xuất sắc.</h4><p className="text-xs text-emerald-400/70">Tiếp tục phát huy nhé!</p></div></div>)}
                        {checkError === currentQ.id && (<div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]"><div className="p-2 bg-red-500/20 rounded-full text-red-400"><AlertTriangle size={20}/></div><span className="font-bold text-sm text-red-300">Chưa đúng! Thử lại xem sao.</span></div>)}
                        <div className="flex flex-col gap-4">
                            {currentQ.type === 'single' && currentQ.options?.map((opt) => {
                                const uAns = userAnswers[currentQ.id], isChecked = isPracticeMode && checkedQuestions[currentQ.id], isError = checkError === currentQ.id, isSelected = uAns === opt.key;
                                let wrapperStyle = "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10", keyStyle = "bg-black/30 text-gray-400 border border-white/5", textStyle = "text-gray-300";
                                if (isChecked) { if (opt.isCorrect) { wrapperStyle = "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.3)]"; keyStyle = "bg-emerald-500 text-black font-bold border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"; textStyle = "text-emerald-300 font-bold"; } else if (isSelected) { wrapperStyle = "border-transparent bg-white/5 opacity-30"; } else { wrapperStyle = "border-transparent bg-transparent opacity-20"; } } 
                                else if (isError && isSelected) { wrapperStyle = "border-red-500/50 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.3)]"; keyStyle = "bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]"; textStyle = "text-red-300 font-bold"; } 
                                else if (isSelected) { wrapperStyle = "border-indigo-500/50 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]"; keyStyle = "bg-indigo-500 text-white font-bold border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"; textStyle = "text-indigo-200 font-bold"; }
                                return <div key={opt.key} onClick={() => handleAnswerChange(currentQ.id, opt.key, 'single')} className={`flex items-center p-4 rounded-2xl border transition-all cursor-pointer group active:scale-[0.97] duration-200 ${wrapperStyle}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm mr-4 transition-all shrink-0 ${keyStyle}`}>{opt.key}</div><div className={`flex-1 text-base transition-all ${textStyle}`}>{opt.text}</div></div>
                            })}
                            {currentQ.type === 'group' && currentQ.options?.map((opt) => (
                                <div key={opt.key} className="p-4 border border-white/5 rounded-2xl bg-white/5 flex justify-between items-center hover:bg-white/10 transition-colors"><div className="font-medium text-gray-200"><span className="font-bold text-cyan-400 mr-2">{opt.key}.</span>{opt.text}</div><div className="flex gap-2">
                                    {['ĐÚNG', 'SAI'].map((label, i) => {
                                        const val = i === 0, myChoice = userAnswers[currentQ.id]?.[opt.key], isLocked = isPracticeMode && checkedQuestions[currentQ.id];
                                        return <button key={label} onClick={() => !isLocked && handleAnswerChange(currentQ.id, val, 'group', opt.key)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${myChoice === val ? (val ? 'bg-blue-600 text-white shadow-lg' : 'bg-pink-600 text-white shadow-lg') : 'bg-black/30 text-gray-500 border border-white/5'}`}>{label}</button>
                                    })}
                                </div></div>
                            ))}
                            {currentQ.type === 'text' && <input type="text" placeholder="Nhập đáp án của bạn..." className="w-full p-4 text-lg bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-cyan-500 transition-all shadow-inner" value={userAnswers[currentQ.id] || ''} onChange={(e) => handleAnswerChange(currentQ.id, e.target.value, 'text')} />}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {screen === 'result' && scoreData && (
            <div className="max-w-3xl mx-auto mt-10 pb-24 space-y-8 animate-fade-in-up">
                <div className="bg-slate-800/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 text-center shadow-[0_0_60px_rgba(124,58,237,0.3)] relative overflow-hidden">
                    <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(234,179,8,0.6)]"><Trophy size={48} className="text-white fill-white/20"/></div>
                    <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-2 tracking-tighter">{scoreData.score}</h2>
                    <p className="text-indigo-300 mb-8 uppercase tracking-[0.3em] text-xs font-bold">Điểm Số Của Bạn</p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-green-500/10 p-5 rounded-2xl border border-green-500/20 text-green-400 font-bold flex flex-col items-center"><span className="text-3xl">{scoreData.correctCount}</span><span className="text-[10px] uppercase opacity-60 tracking-wider mt-1">Chính xác</span></div>
                        <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 text-red-400 font-bold flex flex-col items-center"><span className="text-3xl">{scoreData.total - scoreData.correctCount}</span><span className="text-[10px] uppercase opacity-60 tracking-wider mt-1">Chưa đúng</span></div>
                    </div>
                    <button onClick={() => startExamFinal(questions, false)} className="w-full bg-white text-black py-4 rounded-2xl font-black hover:scale-105 transition-all">THỬ LẠI NGAY</button>
                </div>
                <div className="bg-[#18181b]/60 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><List className="text-cyan-400" /> Chi Tiết Đáp Án</h3>
                    <div className="space-y-4">
                        {questions.map((q, idx) => {
                            const uAns = userAnswers[q.id];
                            if (q.type === 'single' || q.type === 'text') {
                                let isCorrect = q.type === 'single' ? (q.options?.find(o => o.isCorrect)?.key === uAns) : checkAnswerMatch(uAns, q.correctAnswer);
                                let correctStr = q.type === 'single' ? (q.options?.find(o => o.isCorrect)?.key) : q.correctAnswer;
                                return <div key={q.id} className={`p-4 rounded-2xl border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} flex flex-col sm:flex-row gap-4 justify-between sm:items-center`}><div className="font-bold text-gray-200 flex items-center gap-2">{isCorrect ? <CheckCircle2 className="text-emerald-400" size={20}/> : <XCircle className="text-red-400" size={20}/>}Câu {idx + 1}</div><div className="flex gap-2 text-sm w-full sm:w-auto"><div className="flex-1 sm:flex-none bg-black/40 px-4 py-2 rounded-xl text-center border border-white/5"><div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Bạn chọn</div><div className={`font-black ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{uAns || "--"}</div></div><div className="flex-1 sm:flex-none bg-black/40 px-4 py-2 rounded-xl text-center border border-white/5"><div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Đáp án</div><div className="font-black text-cyan-400">{correctStr}</div></div></div></div>
                            }
                            if (q.type === 'group') {
                                return <div key={q.id} className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col gap-3"><div className="font-bold text-gray-200">Câu {idx + 1} (Đúng/Sai)</div><div className="grid grid-cols-1 gap-2">
                                    {q.options?.map(opt => {
                                        const myChoice = uAns ? uAns[opt.key] : undefined, subCorrect = myChoice === opt.isCorrect;
                                        return <div key={opt.key} className={`flex items-center justify-between p-3 rounded-xl bg-black/20 border ${subCorrect ? 'border-emerald-500/20' : 'border-red-500/20'}`}><span className="text-gray-300 text-sm pr-4"><span className="font-bold text-cyan-400">{opt.key}.</span> {opt.text}</span><div className="flex gap-2 text-xs shrink-0"><div className="bg-black/40 px-2 py-1 rounded text-center border border-white/5"><span className="text-gray-500 text-[9px] uppercase block">Bạn</span><span className={`font-bold ${subCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{myChoice === true ? 'ĐÚNG' : myChoice === false ? 'SAI' : '--'}</span></div><div className="bg-black/40 px-2 py-1 rounded text-center border border-white/5"><span className="text-gray-500 text-[9px] uppercase block">Gốc</span><span className="font-bold text-cyan-400">{opt.isCorrect ? 'ĐÚNG' : 'SAI'}</span></div></div></div>
                                    })}
                                </div></div>
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>
        )}
      </main>

      {screen === 'exam' && currentQ && (
          <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
              <div className="pointer-events-auto bg-[#18181b]/90 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
                  <button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${currentQuestionIndex === 0 ? 'text-gray-600' : 'bg-white/5 text-white hover:bg-white/10 hover:scale-110'}`}><ChevronLeft size={24}/></button>
                  <button onClick={() => setShowQuestionGrid(true)} className="h-12 px-6 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center gap-3 font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105 active:scale-95 group"><span className="text-lg tracking-widest">{currentQuestionIndex + 1}<span className="text-white/40 text-sm mx-1">/</span><span className="text-sm opacity-70">{questions.length}</span></span><Grid size={18} className="opacity-70 group-hover:rotate-90 transition-transform"/></button>
                  {currentQuestionIndex < questions.length - 1 ? (<button onClick={handleNextQuestion} className="w-12 h-12 rounded-full bg-white/5 text-white hover:bg-white/10 hover:scale-110 flex items-center justify-center transition-all"><ChevronRight size={24}/></button>) : (<button onClick={handleSubmit} className="h-12 px-6 rounded-full bg-white text-black font-black text-xs hover:scale-105 transition-all">NỘP</button>)}
                  <div className="w-[1px] h-6 bg-white/10"></div>
                  <button onClick={() => handleCheckQuestion(currentQ.id)} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 active:scale-90 hover:scale-110 ${checkError === currentQ.id ? 'bg-orange-500 shadow-[0_0_15px_orange]' : 'bg-purple-600 shadow-[0_0_15px_purple]'}`}>{checkError === currentQ.id ? <RefreshCcw size={20}/> : <Eye size={20}/>}</button>
              </div>
          </div>
      )}
    </div>
  );
}
