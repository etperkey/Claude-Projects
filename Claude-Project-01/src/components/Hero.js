import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// Blood Smear Background Component
function BloodSmearBackground() {
  const cells = useMemo(() => {
    const cellArray = [];
    // Generate 240-300 RBCs for dense smear (~7μm, smaller)
    const numRBCs = 240 + Math.floor(Math.random() * 60);
    for (let i = 0; i < numRBCs; i++) {
      cellArray.push({
        id: i,
        type: 'rbc',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 12 + Math.random() * 8,
        duration: 20 + Math.random() * 30,
        delay: Math.random() * -30,
        opacity: 0.15 + Math.random() * 0.1,
      });
    }

    // WBCs with realistic differential (~60% neutrophils, ~30% lymphocytes, ~10% monocytes)
    let cellId = numRBCs;

    // Neutrophils (5-7) - segmented nucleus, ~12-15μm (2x RBC)
    const numNeutrophils = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numNeutrophils; i++) {
      cellArray.push({
        id: cellId++,
        type: 'neutrophil',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 32 + Math.random() * 12,
        duration: 25 + Math.random() * 35,
        delay: Math.random() * -30,
        opacity: 0.18 + Math.random() * 0.1,
      });
    }

    // Lymphocytes (2-4) - large round nucleus, ~8-12μm (1.5x RBC)
    const numLymphocytes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numLymphocytes; i++) {
      cellArray.push({
        id: cellId++,
        type: 'lymphocyte',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 26 + Math.random() * 10,
        duration: 25 + Math.random() * 35,
        delay: Math.random() * -30,
        opacity: 0.2 + Math.random() * 0.1,
      });
    }

    // Monocytes (1-2) - kidney-shaped nucleus, ~18-22μm (3x RBC, largest WBC)
    const numMonocytes = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numMonocytes; i++) {
      cellArray.push({
        id: cellId++,
        type: 'monocyte',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 42 + Math.random() * 14,
        duration: 25 + Math.random() * 35,
        delay: Math.random() * -30,
        opacity: 0.18 + Math.random() * 0.1,
      });
    }

    return cellArray;
  }, []);

  return (
    <div className="blood-smear-background">
      {cells.map(cell => (
        <div
          key={cell.id}
          className={`floating-cell ${cell.type}`}
          style={{
            left: `${cell.x}%`,
            top: `${cell.y}%`,
            width: `${cell.size}px`,
            height: `${cell.size}px`,
            opacity: cell.opacity,
            animationDuration: `${cell.duration}s`,
            animationDelay: `${cell.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Cell image categories - algorithmically selected best representatives
// Selected using image quality metrics (sharpness, contrast) and typicality scoring
const cellImages = {
  normal: [
    // Neutrophils (top 2)
    { path: '/cell-library/normal/wbc/neutrophil/d2_065.bmp', label: 'Neutrophil' },
    { path: '/cell-library/normal/wbc/neutrophil/d2_064.bmp', label: 'Neutrophil' },
    // Lymphocytes (top 2)
    { path: '/cell-library/normal/wbc/lymphocyte/d2_062.bmp', label: 'Lymphocyte' },
    { path: '/cell-library/normal/wbc/lymphocyte/d2_053.bmp', label: 'Lymphocyte' },
    // Monocytes (top 2)
    { path: '/cell-library/normal/wbc/monocyte/d2_041.bmp', label: 'Monocyte' },
    { path: '/cell-library/normal/wbc/monocyte/d2_047.bmp', label: 'Monocyte' },
    // Eosinophils (top 2)
    { path: '/cell-library/normal/wbc/eosinophil/d2_073.bmp', label: 'Eosinophil' },
    { path: '/cell-library/normal/wbc/eosinophil/d2_072.bmp', label: 'Eosinophil' },
    // Basophils (top 2)
    { path: '/cell-library/normal/wbc/basophil/d2_090.bmp', label: 'Basophil' },
    { path: '/cell-library/normal/wbc/basophil/d2_089.bmp', label: 'Basophil' },
  ],
  malignant: [
    // ALL Blasts (top 2)
    { path: '/cell-library/malignant/leukemia/ALL/UID_67_14_10_all.bmp', label: 'ALL Blast' },
    { path: '/cell-library/malignant/leukemia/ALL/UID_68_2_2_all.bmp', label: 'ALL Blast' },
    // AML Myeloblasts (top 2)
    { path: '/cell-library/malignant/leukemia/AML_myeloblasts/MYB_0021.png', label: 'AML Myeloblast' },
    { path: '/cell-library/malignant/leukemia/AML_myeloblasts/MYB_0042.png', label: 'AML Myeloblast' },
    // AML Monoblasts (top 2)
    { path: '/cell-library/malignant/leukemia/AML_monoblasts/MOB_0009.png', label: 'AML Monoblast' },
    { path: '/cell-library/malignant/leukemia/AML_monoblasts/MOB_0003.png', label: 'AML Monoblast' },
    // Promyelocytes (top 2)
    { path: '/cell-library/malignant/leukemia/promyelocytes/PMO_0007.png', label: 'Promyelocyte' },
    { path: '/cell-library/malignant/leukemia/promyelocytes/PMO_0018.png', label: 'Promyelocyte' },
    // Lymphoma Histology (10x zoomed - individual cells visible)
    { path: '/cell-library/malignant/lymphoma/zoomed/sj-05-1467-R1_001_10x.png', label: 'Follicular Lymphoma' },
    { path: '/cell-library/malignant/lymphoma/zoomed/sj-05-5389-R1_002_10x.png', label: 'Follicular Lymphoma' },
    { path: '/cell-library/malignant/lymphoma/zoomed/sj-04-4967-R2_002_10x.png', label: 'Mantle Cell Lymphoma' },
    { path: '/cell-library/malignant/lymphoma/zoomed/sj-05-4179-R1_007_10x.png', label: 'Mantle Cell Lymphoma' },
    { path: '/cell-library/malignant/lymphoma/zoomed/sj-05-1396-R3_011_10x.png', label: 'CLL/SLL' },
    { path: '/cell-library/malignant/lymphoma/zoomed/sj-05-1396-R3_003_10x.png', label: 'CLL/SLL' },
    // DLBCL - Diffuse Large B-Cell Lymphoma (Wikimedia Commons, 10x zoom)
    { path: '/cell-library/malignant/lymphoma/DLBCL/dlbcl_testis_high_10x.jpg', label: 'DLBCL' },
    { path: '/cell-library/malignant/lymphoma/DLBCL/dlbcl_testis_med_10x.jpg', label: 'DLBCL' },
  ],
};

// Get all cells as a flat array with category
const allCells = [
  ...cellImages.normal.map(c => ({ ...c, category: 'normal' })),
  ...cellImages.malignant.map(c => ({ ...c, category: 'malignant' })),
];

function getRandomCell(exclude = []) {
  // Filter out already used cells
  const available = allCells.filter(c => !exclude.includes(c.path));
  if (available.length === 0) return allCells[Math.floor(Math.random() * allCells.length)];
  return available[Math.floor(Math.random() * available.length)];
}

// Preload an image and return a promise
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

function Hero() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCell, setCurrentCell] = useState(null);

  // Buffer of preloaded cells: 3 ready + 3 loading in background
  const preloadedCells = useRef([]);
  const usedPaths = useRef([]);

  // Initialize preload buffer on mount
  useEffect(() => {
    const initPreload = async () => {
      // Preload 6 random cells (3 ready + 3 backburner)
      const cells = [];
      for (let i = 0; i < 6; i++) {
        const cell = getRandomCell(cells.map(c => c.path));
        cells.push(cell);
      }

      // Start preloading all images
      await Promise.all(cells.map(c => preloadImage(c.path).catch(() => {})));
      preloadedCells.current = cells;
    };

    initPreload();
  }, []);

  // Refill buffer when a cell is used
  const refillBuffer = useCallback(() => {
    // Add a new cell to replace the one used
    const newCell = getRandomCell(usedPaths.current.slice(-10)); // Avoid recent 10
    preloadImage(newCell.path).catch(() => {});
    preloadedCells.current.push(newCell);
  }, []);

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      // Get next preloaded cell or fallback to random
      let nextCell;
      if (preloadedCells.current.length > 0) {
        nextCell = preloadedCells.current.shift();
        usedPaths.current.push(nextCell.path);
        refillBuffer();
      } else {
        nextCell = getRandomCell(usedPaths.current.slice(-10));
        usedPaths.current.push(nextCell.path);
      }
      setCurrentCell(nextCell);
    }
    setIsFlipped(!isFlipped);
  }, [isFlipped, refillBuffer]);

  return (
    <section id="home" className="hero">
      <BloodSmearBackground />
      <div className="hero-content">
        <div className="profile-flip-wrapper">
          <div
            className={`profile-flip-container ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            title={isFlipped ? 'Click to flip back' : 'Click to reveal a blood cell!'}
          >
            <div className="profile-flip-inner">
              <div className="profile-flip-front">
                <img
                  src="https://scholar.googleusercontent.com/citations?view_op=view_photo&user=8AF8PccAAAAJ&citpid=2"
                  alt="Eric Perkey"
                  className="hero-profile-image"
                />
              </div>
              <div className="profile-flip-back">
                {currentCell && (
                  <img
                    src={currentCell.path}
                    alt={currentCell.label}
                    className="hero-cell-image"
                  />
                )}
              </div>
            </div>
          </div>
          {isFlipped && currentCell && (
            <span className={`cell-label ${currentCell.category}`}>
              {currentCell.label}
            </span>
          )}
        </div>
        <p className="hero-greeting">Hello, I'm</p>
        <h1 className="hero-name">Eric Perkey, MD-PhD</h1>
        <h2 className="hero-title">Physician-Scientist | Immunologist | Lymphoma Fellow</h2>
        <p className="hero-description">
          Hematology/Oncology fellow at the University of Chicago investigating
          immune escape mechanisms in lymphoma and developing strategies to
          improve immunotherapy outcomes for patients with blood cancers.
        </p>
        <div className="hero-buttons">
          <a href="#projects" className="btn btn-primary">Current Research</a>
          <a href="#tools" className="btn btn-secondary">Data Tools</a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
