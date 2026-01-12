import React from 'react';
import './DancingBabies.css';

function DancingBabies({ isActive }) {
  if (!isActive) return null;

  // Using local file for reliability
  const babyGif = process.env.PUBLIC_URL + "/dancing-baby.gif";

  return (
    <>
      <div className="dancing-baby baby-1">
        <img
          src={babyGif}
          alt="Dancing Baby"
          crossOrigin="anonymous"
        />
      </div>
      <div className="dancing-baby baby-2">
        <img
          src={babyGif}
          alt="Dancing Baby"
          crossOrigin="anonymous"
        />
      </div>
      <div className="dancing-baby baby-3">
        <img
          src={babyGif}
          alt="Dancing Baby"
          crossOrigin="anonymous"
        />
      </div>
      <div className="dancing-baby baby-4">
        <img
          src={babyGif}
          alt="Dancing Baby"
          crossOrigin="anonymous"
        />
      </div>
    </>
  );
}

export default DancingBabies;
