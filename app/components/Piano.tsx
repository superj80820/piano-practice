'use client';

import { useEffect, useState, useRef } from 'react';
import * as Tone from 'tone';
import { Factory } from 'vexflow';

interface PianoKey {
  note: string;
  color: 'white' | 'black';
  octave: number;
}

// 創建一個八度的音符模板
const NOTES_IN_OCTAVE: { note: string; color: 'white' | 'black' }[] = [
  { note: 'C', color: 'white' },
  { note: 'C#', color: 'black' },
  { note: 'D', color: 'white' },
  { note: 'D#', color: 'black' },
  { note: 'E', color: 'white' },
  { note: 'F', color: 'white' },
  { note: 'F#', color: 'black' },
  { note: 'G', color: 'white' },
  { note: 'G#', color: 'black' },
  { note: 'A', color: 'white' },
  { note: 'A#', color: 'black' },
  { note: 'B', color: 'white' },
];

// 生成完整的49鍵
const PIANO_KEYS: PianoKey[] = [];
for (let octave = 2; octave <= 6; octave++) {
  NOTES_IN_OCTAVE.forEach(({ note, color }) => {
    // 確保我們只生成49鍵（C2到C6）
    if (octave === 6 && note !== 'C') return;

    const fullNote = `${note}${octave}`;
    PIANO_KEYS.push({
      note: fullNote,
      color,
      octave,
    });
  });
}

// 新增：音符到唱名的映射
const NOTE_TO_SOLFEGE: { [key: string]: string } = {
  'C': 'Do',
  'D': 'Re',
  'E': 'Mi',
  'F': 'Fa',
  'G': 'Sol',
  'A': 'La',
  'B': 'Si'
};

export default function Piano() {
  const [synth, setSynth] = useState<Tone.Sampler | null>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMelody, setCurrentMelody] = useState<{ note: string; duration: string }[]>([]);
  const [currentKey] = useState<string>('C');
  const [canReplay, setCanReplay] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);

  // 修改：定義每個調性的升降記號
  const keySignatures: { [key: string]: { type: 'sharp' | 'flat', count: number } } = {
    'C': { type: 'sharp', count: 0 },
    'G': { type: 'sharp', count: 1 },  // F#
    'D': { type: 'sharp', count: 2 },  // F#, C#
    'A': { type: 'sharp', count: 3 },  // F#, C#, G#
    'E': { type: 'sharp', count: 4 },  // F#, C#, G#, D#
    'B': { type: 'sharp', count: 5 },  // F#, C#, G#, D#, A#
    'F': { type: 'flat', count: 1 },  // Bb
    'Bb': { type: 'flat', count: 2 },  // Bb, Eb
    'Eb': { type: 'flat', count: 3 },  // Bb, Eb, Ab
    'Ab': { type: 'flat', count: 4 },  // Bb, Eb, Ab, Db
    'Db': { type: 'flat', count: 5 },  // Bb, Eb, Ab, Db, Gb
  };

  // 修改：轉調函數，根據五度圈處理升降記號
  const transposeNote = (note: string, fromKey: string, toKey: string): string => {
    const noteMap = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    // 解析音符和八度
    const noteName = note.slice(0, -1);
    const octave = parseInt(note.slice(-1));

    // 計算半音差
    const fromSemitones = noteMap[fromKey as keyof typeof noteMap];
    const toSemitones = noteMap[toKey as keyof typeof noteMap];
    const semitoneShift = (toSemitones - fromSemitones + 12) % 12;

    // 根據目標調性的升降記號決定使用升號還是降號
    const useSharp = keySignatures[toKey].type === 'sharp';

    // 計算新音符
    const chromaticScale = useSharp
      ? ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    const currentSemitone = noteMap[noteName as keyof typeof noteMap];
    const newSemitone = (currentSemitone + semitoneShift) % 12;
    const newNote = chromaticScale[newSemitone];

    // 處理八度變化
    let newOctave = octave;
    if (currentSemitone + semitoneShift >= 12) {
      newOctave++;
    } else if (currentSemitone + semitoneShift < 0) {
      newOctave--;
    }

    return `${newNote}${newOctave}`;
  };

  useEffect(() => {
    const newSynth = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      release: 1,
      volume: -12,
      onload: () => {
        console.log("鋼琴音色載入完成");
      },
      onerror: (error) => {
        console.error("鋼琴音色載入失敗:", error);
      }
    }).toDestination();

    // 添加效果器來模擬真實鋼琴音色
    const reverb = new Tone.Reverb({
      decay: 2.5,        // 較長的衰減時間
      wet: 0.15,         // 適中的混響量
      preDelay: 0.01     // 短的預延遲
    }).toDestination();

    // 添加壓縮器來平衡音量
    const compressor = new Tone.Compressor({
      threshold: -24,    // 壓縮閾值
      ratio: 3,         // 壓縮比
      attack: 0.003,    // 快速起音
      release: 0.25     // 適中的釋放時間
    }).toDestination();

    // 連接效果器鏈
    newSynth.chain(compressor, reverb);
    setSynth(newSynth);

    // 初始化 Tone.js
    Tone.Transport.bpm.value = 120;

    return () => {
      newSynth.dispose();
      reverb.dispose();
      compressor.dispose();
    };
  }, []);

  // 修改：繪製五線譜和唱名
  const drawScore = (melody: { note: string; duration: string }[]) => {
    if (!scoreRef.current) return;

    try {
      // 清除現有的五線譜
      scoreRef.current.innerHTML = '';

      // 初始化 VexFlow
      const vf = new Factory({
        renderer: {
          elementId: 'score',
          width: 1000,
          height: 200,  // 增加高度以容納唱名
        },
      });

      const score = vf.EasyScore();
      const system = vf.System({
        width: 900,
        spaceBetweenStaves: 10
      });

      // 將 melody 轉換為 VexFlow 格式
      const notesString = melody
        .map(({ note, duration }) => {
          const vfNote = note.toLowerCase();
          let vfDuration;
          switch (duration) {
            case '2n':
              vfDuration = 'h';
              break;
            case '4n':
              vfDuration = 'q';
              break;
            case '8n':
              vfDuration = '8';
              break;
            default:
              vfDuration = 'q';
          }
          return `${vfNote}/${vfDuration}`;
        })
        .join(', ');

      // 創建基本的五線譜
      const stave = system
        .addStave({
          voices: [
            score.voice(score.notes(notesString))
          ]
        })
        .addClef('treble')
        .addTimeSignature('4/4');

      // 繪製五線譜
      vf.draw();

      // 添加唱名
      const context = vf.getContext();
      const notes = melody.map(m => m.note);
      const staveInfo = stave.getBoundingBox();
      const noteWidth = staveInfo.w / notes.length;
      const startX = staveInfo.x;
      const y = staveInfo.y + staveInfo.h + 30;  // 在五線譜下方 30px

      notes.forEach((note, index) => {
        const noteName = note.slice(0, -1);  // 移除八度數字
        const solfege = NOTE_TO_SOLFEGE[noteName.replace(/[#b]/, '')];  // 處理升降記號
        const x = startX + (noteWidth * (index + 0.5));  // 置中對齊每個音符

        context.save();
        context.setFont('Arial', 16);
        context.fillText(solfege, x - 15, y);
        context.restore();
      });

    } catch (error) {
      console.error('Error drawing score:', error);
    }
  };

  // 新增：重播旋律的函數
  const replayMelody = () => {
    if (!synth || isPlaying || currentMelody.length === 0) return;
    setIsPlaying(true);

    // 確保 Tone.js 已經準備好
    Tone.start();

    // 設置播放序列
    let time = 0;
    const now = Tone.now();

    currentMelody.forEach(({ note, duration }) => {
      // 根據音符時值設置持續時間
      let durationInSeconds;
      switch (duration) {
        case '2n':
          durationInSeconds = 1.0;  // 二分音符
          break;
        case '4n':
          durationInSeconds = 0.5;  // 四分音符
          break;
        case '8n':
          durationInSeconds = 0.25; // 八分音符
          break;
        default:
          durationInSeconds = 0.5;  // 預設為四分音符
      }

      synth.triggerAttackRelease(note, duration, now + time);

      setTimeout(() => {
        setActiveKeys(new Set([note]));
      }, time * 1000);

      setTimeout(() => {
        setActiveKeys(new Set());
      }, (time + durationInSeconds) * 1000);

      time += durationInSeconds;
    });

    setTimeout(() => {
      setIsPlaying(false);
    }, time * 1000);
  };

  // 新增：定義每個調性的音階
  const scaleNotes: { [key: string]: string[] } = {
    'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
    'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']
  };

  // 修改：根據調性獲取和弦音符的輔助函數
  const getChordNotes = (root: string, octave: string): string[] => {
    const scale = scaleNotes[currentKey];
    if (!scale) return [];

    // 在當前調性的音階中找到根音的位置
    const rootIndex = scale.findIndex(note => note === root);
    if (rootIndex === -1) return [];

    // 計算三和弦的音符（根音、三度、五度）
    const octaveNum = parseInt(octave);
    const rootNote = `${scale[rootIndex]}${octave}`;
    const thirdNote = `${scale[(rootIndex + 2) % 7]}${(rootIndex + 2) >= 7 ? octaveNum + 1 : octaveNum}`;
    const fifthNote = `${scale[(rootIndex + 4) % 7]}${(rootIndex + 4) >= 7 ? octaveNum + 1 : octaveNum}`;

    return [rootNote, thirdNote, fifthNote];
  };

  // 修改：generateCMajorMelody 函數中的和弦進行
  const generateCMajorMelody = () => {
    if (!synth || isPlaying) return;
    setIsPlaying(true);

    // 確保 Tone.js 已經準備好
    Tone.start();

    // 根據當前調性定義和弦進行
    const chordProgressions: { [key: string]: string[][] } = {
      'C': [
        // I - IV - V - I
        ['C4', 'F4', 'G4', 'C4'],
        // I - vi - IV - V
        ['C4', 'A4', 'F4', 'G4'],
        // I - V - vi - IV
        ['C4', 'G4', 'A4', 'F4'],
        // vi - IV - I - V
        ['A4', 'F4', 'C4', 'G4']
      ]
    };

    // 獲取或生成當前調性的和弦進行
    const progressions = currentKey === 'C' ? chordProgressions['C'] :
      chordProgressions['C'].map(progression =>
        progression.map(note => transposeNote(note, 'C', currentKey))
      );

    // 隨機選擇和弦進行
    const selectedProgression = progressions[Math.floor(Math.random() * progressions.length)];

    // 定義節奏型態（總和必須為4拍）
    const rhythmPatterns = [
      // 基本節奏
      ['4n', '4n', '4n', '4n'],  // 四個四分音符
      ['2n', '4n', '4n'],        // 一個二分音符加兩個四分音符
      ['4n', '2n', '4n'],        // 四分音符、二分音符、四分音符
      // 包含八分音符的節奏
      ['4n', '8n', '8n', '4n', '4n'],  // 四分音符、兩個八分音符、兩個四分音符
      ['8n', '8n', '4n', '4n', '4n'],  // 兩個八分音符、三個四分音符
      ['4n', '4n', '8n', '8n', '4n'],  // 兩個四分音符、兩個八分音符、一個四分音符
    ];

    // 隨機選擇節奏型態
    const selectedRhythm = rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];

    // 為每個和弦生成相應的旋律音符
    const melody: { note: string; duration: string }[] = [];
    let rhythmIndex = 0;
    let chordIndex = 0;

    // 根據選定的節奏型態生成旋律
    selectedRhythm.forEach((duration) => {
      // 獲取當前和弦
      const rootNote = selectedProgression[chordIndex];
      const octave = rootNote.slice(-1);
      const note = rootNote.slice(0, -1);

      // 根據和弦音程生成可能的旋律音符（需要根據當前調性調整）
      let possibleNotes: string[] = [];
      const chordNotes = getChordNotes(note, octave);
      possibleNotes = chordNotes;

      // 從和弦音中隨機選擇一個音符
      const selectedNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
      melody.push({
        note: selectedNote,
        duration: duration
      });

      // 只有在遇到四分音符或二分音符時才更新和弦
      if (duration === '4n' || duration === '2n') {
        rhythmIndex++;
        if (rhythmIndex >= 2) {
          rhythmIndex = 0;
          chordIndex = Math.min(chordIndex + 1, selectedProgression.length - 1);
        }
      }
    });

    setCurrentMelody(melody);
    setCanReplay(true);  // 新增：啟用重播按鈕
    drawScore(melody);

    // 設置播放序列
    let time = 0;
    const now = Tone.now();

    melody.forEach(({ note, duration }) => {
      // 根據音符時值設置持續時間
      let durationInSeconds;
      switch (duration) {
        case '2n':
          durationInSeconds = 1.0;  // 二分音符
          break;
        case '4n':
          durationInSeconds = 0.5;  // 四分音符
          break;
        case '8n':
          durationInSeconds = 0.25; // 八分音符
          break;
        default:
          durationInSeconds = 0.5;  // 預設為四分音符
      }

      synth.triggerAttackRelease(note, duration, now + time);

      setTimeout(() => {
        setActiveKeys(new Set([note]));
      }, time * 1000);

      setTimeout(() => {
        setActiveKeys(new Set());
      }, (time + durationInSeconds) * 1000);

      time += durationInSeconds;
    });

    setTimeout(() => {
      setIsPlaying(false);
    }, time * 1000);
  };

  // 當組件掛載時繪製空白的五線譜
  useEffect(() => {
    drawScore([
      { note: 'G4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'F4', duration: '4n' }
    ]);
  }, []);

  const playNote = (note: string) => {
    if (synth && !activeKeys.has(note)) {
      setActiveKeys((prev) => new Set(prev).add(note));
      synth.triggerAttack(note, Tone.now());
    }
  };

  const stopNote = (note: string) => {
    if (synth) {
      setActiveKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
      synth.triggerRelease(note, Tone.now());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 gap-8">
      <div className="flex gap-4">
        <button
          onClick={generateCMajorMelody}
          disabled={isPlaying}
          className={`
            px-6 py-3 rounded-full text-white font-semibold
            ${isPlaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 active:bg-green-700'}
            transition-colors shadow-lg
          `}
        >
          {isPlaying ? '播放中...' : '重新生成五線譜'}
        </button>

        <button
          onClick={replayMelody}
          disabled={isPlaying || !canReplay}
          className={`
            px-6 py-3 rounded-full text-white font-semibold
            ${isPlaying || !canReplay
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
            transition-colors shadow-lg
          `}
        >
          {isPlaying ? '播放中...' : '重播旋律'}
        </button>

        <button
          onClick={() => setShowScore(!showScore)}
          className={`
            px-6 py-3 rounded-full text-white font-semibold
            ${showScore ? 'bg-purple-600' : 'bg-purple-500 hover:bg-purple-600'} 
            transition-colors shadow-lg
          `}
        >
          {showScore ? '隱藏五線譜' : '顯示五線譜'}
        </button>
      </div>

      <div
        className={`
          bg-white p-4 rounded-lg shadow-lg
          transition-all duration-500 ease-in-out
          ${showScore ? 'opacity-100 visible' : 'opacity-0 invisible'}
          transform ${showScore ? 'translate-y-0' : '-translate-y-4'}
        `}
      >
        <div
          id="score"
          ref={scoreRef}
          style={{ minWidth: '500px', minHeight: '200px' }}
        />
      </div>

      <div className="relative flex overflow-x-auto max-w-full p-4">
        <div className="relative flex">
          {PIANO_KEYS.map((key, index) => {
            const isBlackKey = key.color === 'black';
            const previousKey = index > 0 ? PIANO_KEYS[index - 1] : null;

            // 計算黑鍵的位置偏移
            let marginLeft = '0px';
            if (isBlackKey) {
              marginLeft = '-1rem';
            } else if (previousKey?.color === 'black') {
              marginLeft = '0px';
            }

            // 判斷是否需要更大的間距（在 E 和 B 音符之後）
            const noteWithoutOctave = key.note.replace(/\d+/, '');
            if (!isBlackKey && (noteWithoutOctave === 'E' || noteWithoutOctave === 'B')) {
              marginLeft = '0px';
            }

            return (
              <div
                key={key.note}
                className={`
                  relative
                  ${isBlackKey
                    ? 'w-8 h-28 bg-black -ml-4 -mr-4 z-10'
                    : 'w-14 h-44 bg-white border border-gray-300 z-0'}
                  ${activeKeys.has(key.note) ? (isBlackKey ? 'bg-blue-800' : 'bg-blue-200') : ''}
                  rounded-b-md cursor-pointer transition-colors
                  ${isBlackKey ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}
                  shadow-md
                `}
                style={{
                  marginLeft: marginLeft
                }}
                onMouseDown={() => playNote(key.note)}
                onMouseUp={() => stopNote(key.note)}
                onMouseLeave={() => stopNote(key.note)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}