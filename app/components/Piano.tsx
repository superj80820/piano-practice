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

// 新增：所有調性的音階定義
const SCALES = {
  major: [
    // C大調 (C Major)
    ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    // G大調 (G Major)
    ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    // D大調 (D Major)
    ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'],
    // A大調 (A Major)
    ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
    // E大調 (E Major)
    ['E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D#5', 'E5'],
    // B大調 (B Major)
    ['B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5', 'A#5', 'B5'],
    // F大調 (F Major)
    ['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5'],
    // Bb大調 (Bb Major)
    ['Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5', 'A5', 'Bb5'],
    // Eb大調 (Eb Major)
    ['Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'D5', 'Eb5'],
    // Ab大調 (Ab Major)
    ['Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5', 'G5', 'Ab5'],
    // Db大調 (Db Major)
    ['Db4', 'Eb4', 'F4', 'Gb4', 'Ab4', 'Bb4', 'C5', 'Db5'],
    // Gb大調 (Gb Major)
    ['Gb4', 'Ab4', 'Bb4', 'Cb5', 'Db5', 'Eb5', 'F5', 'Gb5']
  ],
  minor: [
    // A小調 (A Minor)
    ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
    // E小調 (E Minor)
    ['E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'],
    // B小調 (B Minor)
    ['B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5'],
    // F#小調 (F# Minor)
    ['F#4', 'G#4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5'],
    // C#小調 (C# Minor)
    ['C#4', 'D#4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5'],
    // G#小調 (G# Minor)
    ['G#4', 'A#4', 'B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5'],
    // D小調 (D Minor)
    ['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5'],
    // G小調 (G Minor)
    ['G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5'],
    // C小調 (C Minor)
    ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'],
    // F小調 (F Minor)
    ['F4', 'G4', 'Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5'],
    // Bb小調 (Bb Minor)
    ['Bb4', 'C5', 'Db5', 'Eb5', 'F5', 'Gb5', 'Ab5', 'Bb5'],
    // Eb小調 (Eb Minor)
    ['Eb4', 'F4', 'Gb4', 'Ab4', 'Bb4', 'Cb5', 'Db5', 'Eb5']
  ]
};

export default function Piano() {
  const [synth, setSynth] = useState<Tone.Sampler | null>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMelody, setCurrentMelody] = useState<{ note: string; duration: string }[]>([]);
  const [canReplay, setCanReplay] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showSolfege, setShowSolfege] = useState(false);
  const [measureCount, setMeasureCount] = useState<2 | 4>(4);
  const [currentScale, setCurrentScale] = useState<string>('');
  const scoreRef = useRef<HTMLDivElement>(null);

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

      // 初始化 VexFlow，根據小節數調整寬度
      const vf = new Factory({
        renderer: {
          elementId: 'score',
          width: measureCount === 2 ? 800 : 1200,
          height: measureCount === 2 ? 250 : 500,
        },
      });

      const score = vf.EasyScore();
      const system = vf.System();

      // 將音符分組為每小節
      const measuresNotes: { note: string; duration: string }[][] = [];
      let currentMeasure: { note: string; duration: string }[] = [];
      let currentBeats = 0;

      melody.forEach((noteInfo) => {
        let beatValue: number;
        switch (noteInfo.duration) {
          case '2n':
            beatValue = 2;
            break;
          case '4n':
            beatValue = 1;
            break;
          case '8n':
            beatValue = 0.5;
            break;
          case '16n':
            beatValue = 0.25;
            break;
          default:
            beatValue = 1;
        }

        if (currentBeats + beatValue > 4) {
          measuresNotes.push([...currentMeasure]);
          currentMeasure = [noteInfo];
          currentBeats = beatValue;
        } else {
          currentMeasure.push(noteInfo);
          currentBeats += beatValue;
        }
      });

      if (currentMeasure.length > 0) {
        measuresNotes.push(currentMeasure);
      }

      // 為每個小節創建音符字符串
      const measureStrings = measuresNotes.map(measure => {
        if (measure.length === 0) {
          return 'B4/w';  // 如果小節為空，使用全音符休止符
        }

        let totalBeats = 0;
        const notes = measure.map(({ note, duration }) => {
          const vfNote = note.toLowerCase();
          let vfDuration;
          switch (duration) {
            case '2n':
              vfDuration = 'h';
              totalBeats += 2;
              break;
            case '4n':
              vfDuration = 'q';
              totalBeats += 1;
              break;
            case '8n':
              vfDuration = '8';
              totalBeats += 0.5;
              break;
            case '16n':
              vfDuration = '16';
              totalBeats += 0.25;
              break;
            default:
              vfDuration = 'q';
              totalBeats += 1;
          }
          return `${vfNote}/${vfDuration}`;
        });

        // 如果小節不足4拍，添加休止符
        if (totalBeats < 4) {
          const remainingBeats = 4 - totalBeats;
          if (remainingBeats >= 2) {
            notes.push('B4/h');  // 添加二分休止符
          } else if (remainingBeats >= 1) {
            notes.push('B4/q');  // 添加四分休止符
          } else if (remainingBeats >= 0.5) {
            notes.push('B4/8');  // 添加八分休止符
          }
        }

        return notes.join(', ');
      });

      // 創建第一個小節
      system
        .addStave({
          voices: [
            score.voice(score.notes(measureStrings[0]))
          ]
        })
        .addClef('treble')
        .addTimeSignature('4/4');

      // 創建剩餘的小節
      for (let i = 1; i < measureCount; i++) {
        system.addStave({
          voices: [
            score.voice(score.notes(measureStrings[i] || 'B4/w'))  // 如果沒有音符，使用全音符休止符
          ]
        });
      }

      vf.draw();

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

  // 修改：generateCMajorMelody 函数，添加調性顯示
  const generateCMajorMelody = () => {
    if (!synth || isPlaying) return;
    setIsPlaying(true);

    // 確保 Tone.js 已經準備好
    Tone.start();

    // 隨機選擇調性類型（大調或小調）
    const scaleTypes = ['major', 'minor'] as const;
    const selectedType = scaleTypes[Math.floor(Math.random() * scaleTypes.length)];

    // 在選定的調性類型中隨機選擇一個音階
    const scales = SCALES[selectedType];
    const scaleIndex = Math.floor(Math.random() * scales.length);
    const selectedScale = scales[scaleIndex];

    // 設置當前調性名稱
    const scaleNames = {
      major: [
        'C 大調', 'G 大調', 'D 大調', 'A 大調', 'E 大調', 'B 大調',
        'F 大調', 'Bb 大調', 'Eb 大調', 'Ab 大調', 'Db 大調', 'Gb 大調'
      ],
      minor: [
        'A 小調', 'E 小調', 'B 小調', 'F# 小調', 'C# 小調', 'G# 小調',
        'D 小調', 'G 小調', 'C 小調', 'F 小調', 'Bb 小調', 'Eb 小調'
      ]
    };
    setCurrentScale(scaleNames[selectedType][scaleIndex]);

    // 使用選定的音階
    const availableNotes = selectedScale;

    // 定义节奏型态（根据小节数提供不同的节奏型态）
    const rhythmPatterns = measureCount === 2 ? [
      // 2小节的节奏型态（8拍）
      ['4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n'],           // ♩ ♩ ♩ ♩ | ♩ ♩ ♩ ♩
      ['2n', '2n', '2n', '2n'],                                   // ♩♩ ♩♩ | ♩♩ ♩♩
      ['2n', '4n', '4n', '2n', '4n', '4n'],                       // ♩♩ ♩ ♩ | ♩♩ ♩ ♩
      ['4n', '4n', '2n', '4n', '4n', '2n'],                       // ♩ ♩ ♩♩ | ♩ ♩ ♩♩
      ['8n', '8n', '4n', '4n', '4n', '8n', '8n', '4n', '4n', '4n'], // ♪♪ ♩ ♩ ♩ | ♪♪ ♩ ♩ ♩
      ['4n', '8n', '8n', '4n', '4n', '4n', '8n', '8n', '4n', '4n']  // ♩ ♪♪ ♩ ♩ | ♩ ♪♪ ♩ ♩
    ] : [
      // 4小节的节奏型态（16拍）
      ['4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n', '4n'],  // 全四分音符
      ['2n', '2n', '2n', '2n', '2n', '2n', '2n', '2n'],  // 全二分音符
      ['2n', '4n', '4n', '2n', '2n', '4n', '4n', '2n'],  // 混合节奏
      ['8n', '8n', '4n', '4n', '4n', '8n', '8n', '4n', '4n', '4n', '8n', '8n', '4n', '4n', '4n', '8n', '8n', '4n', '4n', '4n']  // 包含八分音符
    ];

    // 随机选择节奏型态
    const selectedRhythm = rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];

    // 生成旋律
    const melody: { note: string; duration: string }[] = selectedRhythm.map(duration => ({
      note: availableNotes[Math.floor(Math.random() * availableNotes.length)],
      duration: duration
    }));

    setCurrentMelody(melody);
    setCanReplay(true);
    drawScore(melody);

    // 播放旋律
    let time = 0;
    const now = Tone.now();

    melody.forEach(({ note, duration }) => {
      let durationInSeconds;
      switch (duration) {
        case '2n':
          durationInSeconds = 1.0;
          break;
        case '4n':
          durationInSeconds = 0.5;
          break;
        case '8n':
          durationInSeconds = 0.25;
          break;
        case '16n':
          durationInSeconds = 0.125;
          break;
        default:
          durationInSeconds = 0.5;
      }

      synth.triggerAttackRelease(note, durationInSeconds, now + time);

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

  // 新增：獲取當前旋律的唱名
  const getMelodySolfege = (melody: { note: string; duration: string }[]) => {
    return melody.map(({ note, duration }) => {
      const noteName = note.slice(0, -1);
      const solfege = NOTE_TO_SOLFEGE[noteName.replace(/[#b]/, '')];
      return {
        solfege,
        duration
      };
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 gap-8">
      <div className="flex gap-4 flex-wrap justify-center">
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
          onClick={() => setShowSolfege(!showSolfege)}
          className={`
            px-6 py-3 rounded-full text-white font-semibold
            ${showSolfege ? 'bg-orange-600' : 'bg-orange-500 hover:bg-orange-600'} 
            transition-colors shadow-lg
          `}
        >
          {showSolfege ? '不產生唱名' : '產生唱名'}
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

        <button
          onClick={() => setMeasureCount(measureCount === 2 ? 4 : 2)}
          className={`
            px-6 py-3 rounded-full text-white font-semibold
            bg-teal-500 hover:bg-teal-600 active:bg-teal-700
            transition-colors shadow-lg
          `}
        >
          {`切換為 ${measureCount === 2 ? '4' : '2'} 小節`}
        </button>
      </div>

      <div
        className={`
          flex flex-col gap-4
          transition-all duration-500 ease-in-out
          ${showScore ? 'opacity-100 visible' : 'opacity-0 invisible'}
          transform ${showScore ? 'translate-y-0' : '-translate-y-4'}
          w-full max-w-[95vw]
        `}
      >
        {currentScale && (
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 text-center">
              當前調性：{currentScale}
            </h2>
          </div>
        )}

        <div className="bg-white p-8 rounded-lg shadow-lg overflow-x-auto">
          <div
            id="score"
            ref={scoreRef}
            style={{
              minWidth: measureCount === 2 ? '800px' : '1200px',
              minHeight: measureCount === 2 ? '250px' : '500px',
              margin: '0 auto'
            }}
          />
        </div>
      </div>

      {showSolfege && currentMelody.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-[95vw] overflow-x-auto">
          <div className="flex justify-center items-center gap-4" style={{
            minWidth: measureCount === 2 ? '800px' : '1200px',
          }}>
            {getMelodySolfege(currentMelody).map((item, index) => (
              <div
                key={index}
                className={`
                  text-center font-semibold text-lg text-black
                  ${item.duration === '2n' ? 'w-16' :
                    item.duration === '4n' ? 'w-12' :
                      item.duration === '8n' ? 'w-8' : 'w-6'}
                `}
              >
                {item.solfege}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex overflow-x-auto max-w-full p-4">
        <div className="relative flex">
          {PIANO_KEYS.map((key, index) => {
            const isBlackKey = key.color === 'black';
            const previousKey = index > 0 ? PIANO_KEYS[index - 1] : null;

            let marginLeft = '0px';
            if (isBlackKey) {
              marginLeft = '-1rem';
            } else if (previousKey?.color === 'black') {
              marginLeft = '0px';
            }

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
                style={{ marginLeft }}
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