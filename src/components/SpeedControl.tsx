"use client";
import { useState } from "react";

function SpeedControl({
  playbackRate,
  onChange,
}: {
  playbackRate: number;
  onChange: (rate: number) => void;
}) {
  const speeds = [1, 1.25, 1.5, 2];
  const [isOpen, setIsOpen] = useState(false);
  // let currentRateIndex = 0;

  const handleSelectSpeed = (speed: number) => {
    onChange(speed);
    setIsOpen(false);
  };
  // currentRateIndex = (currentRateIndex + 1) % speeds.length;
  //                               const newRate = speeds[currentRateIndex];
  //                               wavesurfer.setPlaybackRate(newRate);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer rounded-md bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300"
      >
        x{playbackRate}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mb-2 rounded-md bg-white p-1 shadow-lg">
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => handleSelectSpeed(speed)}
              className={`block w-full rounded-md px-2 py-1 text-left text-sm ${
                speed === playbackRate
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100"
              }`}
            >
              x{speed}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default SpeedControl;
