'use client'

import { handleClientScriptLoad } from 'next/script';
import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const WaveformVisualizer = ({ audioUrl }: { audioUrl: string }) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false)

  const speepOptions: number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  useEffect(() => {
    if (!waveformRef.current) return;

    // Création de l'instance WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#e2e8f0',
      progressColor: '#6366f1',
      cursorColor: '#818cf8',
      barWidth: 2,
      barRadius: 5,
      cursorWidth: 4,
      height: 50,
      barGap: 2,
    });

    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      wavesurferRef.current = wavesurfer;
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate)
    }
  
  }, [playbackRate])
  

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };
  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate)
    setShowSpeedOptions(false)
  }

  const toggleSpeedOptions = () => {
    setShowSpeedOptions(!showSpeedOptions)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 w-11/12 md:max-w-2xl bg-gray-100 rounded-xl">
      <button 
        onClick={togglePlayPause}
        className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      <div className="flex-1">
        <div ref={waveformRef} className="w-full" />
      </div>
      <div className="text-sm font-mono text-gray-600">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      <div className="relative">
        <button
        onClick={toggleSpeedOptions}
        className='px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md'
        >
          x{playbackRate}
        </button>
        {showSpeedOptions && (
          <div className="absolute right-0 bottom-full mb-2 bg-white shadow-lg rounded-md p-1 z-10">
            {speepOptions.map((rate)=> (
              <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              className={`block w-full px-3 py-1 text-left text-sm rounded hover:bg-gray-100 ${rate === playbackRate ? 'bg-blue-100 text-blue-600': ''}`}>
                x{rate}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaveformVisualizer;