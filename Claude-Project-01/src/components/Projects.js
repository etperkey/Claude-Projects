import React, { useState } from 'react';
import './Projects.css';

// Professional Nature Immunology-style illustrations with animations
const ProjectIllustrations = {
  // TP53 - Immune escape mechanism
  tp53: (
    <svg viewBox="0 0 500 280" className="project-illustration nature-style">
      <defs>
        {/* Professional gradients */}
        <linearGradient id="tumorCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B2942" />
          <stop offset="50%" stopColor="#A13553" />
          <stop offset="100%" stopColor="#722236" />
        </linearGradient>
        <linearGradient id="tCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D5A8A" />
          <stop offset="50%" stopColor="#3D6A9A" />
          <stop offset="100%" stopColor="#1D4A7A" />
        </linearGradient>
        <linearGradient id="membraneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5A4A6A" />
          <stop offset="50%" stopColor="#4A3A5A" />
          <stop offset="100%" stopColor="#5A4A6A" />
        </linearGradient>
        <filter id="cellShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.2"/>
        </filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Membrane pattern */}
        <pattern id="membranePattern" patternUnits="userSpaceOnUse" width="12" height="20">
          <ellipse cx="6" cy="5" rx="5" ry="3" fill="#6A5A7A" opacity="0.6"/>
          <ellipse cx="6" cy="15" rx="5" ry="3" fill="#6A5A7A" opacity="0.6"/>
        </pattern>
      </defs>

      {/* Background */}
      <rect width="500" height="280" fill="#FAFBFC"/>

      {/* Title bar */}
      <rect x="0" y="0" width="500" height="32" fill="#F0F2F5"/>
      <text x="250" y="21" textAnchor="middle" className="illustration-title">TP53 Loss-of-Function: Immune Escape Mechanism</text>

      {/* Tumor Cell */}
      <g className="tumor-cell" filter="url(#cellShadow)">
        {/* Cell body */}
        <ellipse cx="130" cy="150" rx="75" ry="70" fill="url(#tumorCellGrad)" className="cell-pulse"/>
        {/* Nucleus */}
        <ellipse cx="130" cy="155" rx="35" ry="30" fill="#5A1A2A" opacity="0.7"/>
        <ellipse cx="125" cy="150" rx="12" ry="10" fill="#3A0A1A" opacity="0.5"/>
        {/* TP53 mutation indicator */}
        <g className="mutation-flash">
          <path d="M115 145 L145 175 M145 145 L115 175" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round"/>
        </g>
        {/* Cell label */}
        <text x="130" y="235" textAnchor="middle" className="cell-label">TP53-mutant</text>
        <text x="130" y="248" textAnchor="middle" className="cell-label">DLBCL cell</text>
      </g>

      {/* Membrane with MHC-I (downregulated) */}
      <g className="membrane-section">
        {/* MHC-I molecules - faded/absent */}
        <g opacity="0.25" className="mhc-fade">
          <rect x="195" y="120" width="8" height="25" rx="2" fill="#7A8A9A"/>
          <rect x="195" y="155" width="8" height="25" rx="2" fill="#7A8A9A"/>
          <circle cx="199" cy="115" r="6" fill="#9AAABA"/>
          <circle cx="199" cy="185" r="6" fill="#9AAABA"/>
        </g>
        {/* Downregulation indicator */}
        <g className="down-arrow-pulse">
          <path d="M215 140 L225 150 L215 160" stroke="#C41E3A" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M220 140 L230 150 L220 160" stroke="#C41E3A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
        </g>
      </g>

      {/* Signaling block indicator */}
      <g className="signal-block">
        <line x1="240" y1="150" x2="300" y2="150" stroke="#BDC3C7" strokeWidth="2" strokeDasharray="8,4" className="dashed-animate"/>
        <g transform="translate(270, 150)">
          <circle r="15" fill="#FAFBFC" stroke="#E74C3C" strokeWidth="2"/>
          <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#E74C3C" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
      </g>

      {/* CD8+ T Cell */}
      <g className="t-cell" filter="url(#cellShadow)">
        <ellipse cx="380" cy="150" rx="60" ry="55" fill="url(#tCellGrad)" className="cell-pulse-slow" opacity="0.6"/>
        {/* Nucleus */}
        <ellipse cx="385" cy="155" rx="25" ry="22" fill="#1A3A5A" opacity="0.6"/>
        {/* TCR */}
        <g opacity="0.4">
          <rect x="312" y="140" width="10" height="20" rx="3" fill="#5A8ABA"/>
          <circle cx="317" cy="135" r="8" fill="#7AAADA"/>
        </g>
        {/* Cell label */}
        <text x="380" y="235" textAnchor="middle" className="cell-label">CD8+ T cell</text>
        <text x="380" y="248" textAnchor="middle" className="cell-label-sub">(Unable to recognize)</text>
      </g>

      {/* Molecular pathway box */}
      <g transform="translate(20, 255)">
        <rect width="460" height="20" rx="3" fill="#FEF5F5" stroke="#FADBD8" strokeWidth="1"/>
        <text x="230" y="14" textAnchor="middle" className="pathway-text">
          TAP1/ERAP1 ↓ → MHC-I antigen presentation ↓ → CD8+ T cell recognition ✗
        </text>
      </g>
    </svg>
  ),

  // BiTE - T-cell engagement and exhaustion
  bite: (
    <svg viewBox="0 0 500 280" className="project-illustration nature-style">
      <defs>
        <linearGradient id="bCellTumorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B4A8A" />
          <stop offset="50%" stopColor="#6B5A9A" />
          <stop offset="100%" stopColor="#4B3A7A" />
        </linearGradient>
        <linearGradient id="tCellActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A6B5A" />
          <stop offset="50%" stopColor="#2A7B6A" />
          <stop offset="100%" stopColor="#0A5B4A" />
        </linearGradient>
        <linearGradient id="biteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A84B" />
          <stop offset="100%" stopColor="#C4983B" />
        </linearGradient>
        <filter id="biteGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width="500" height="280" fill="#FAFBFC"/>

      <rect x="0" y="0" width="500" height="32" fill="#F0F2F5"/>
      <text x="250" y="21" textAnchor="middle" className="illustration-title">Bispecific T-cell Engager (BiTE) Mechanism</text>

      {/* Tumor B Cell */}
      <g className="b-cell-tumor" filter="url(#cellShadow)">
        <ellipse cx="120" cy="145" rx="65" ry="60" fill="url(#bCellTumorGrad)" className="cell-pulse"/>
        <ellipse cx="115" cy="150" rx="28" ry="24" fill="#3B2A6A" opacity="0.6"/>
        {/* CD20 marker */}
        <g className="receptor-glow">
          <rect x="177" y="130" width="10" height="30" rx="3" fill="#8B7AAA"/>
          <circle cx="182" cy="125" r="8" fill="#AB9ACA"/>
        </g>
        <text x="120" y="220" textAnchor="middle" className="cell-label">CD20+ Lymphoma</text>
        <text x="120" y="233" textAnchor="middle" className="cell-label">B cell</text>
      </g>

      {/* BiTE Molecule */}
      <g className="bite-molecule" filter="url(#biteGlow)">
        {/* Central bridge */}
        <ellipse cx="250" cy="145" rx="40" ry="18" fill="url(#biteGrad)" className="bite-pulse"/>
        {/* Arms */}
        <g className="bite-arm-left">
          <line x1="210" y1="145" x2="187" y2="145" stroke="#D4A84B" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="187" cy="145" r="8" fill="#E4B85B"/>
        </g>
        <g className="bite-arm-right">
          <line x1="290" y1="145" x2="313" y2="145" stroke="#D4A84B" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="313" cy="145" r="8" fill="#E4B85B"/>
        </g>
        <text x="250" y="149" textAnchor="middle" className="bite-label">CD20×CD3</text>
        <text x="250" y="175" textAnchor="middle" className="molecule-label">BiTE</text>
      </g>

      {/* T Cell with exhaustion */}
      <g className="t-cell-exhausted" filter="url(#cellShadow)">
        <ellipse cx="380" cy="145" rx="65" ry="60" fill="url(#tCellActiveGrad)" className="cell-pulse-slow"/>
        <ellipse cx="385" cy="150" rx="28" ry="24" fill="#0A4B3A" opacity="0.6"/>
        {/* CD3 marker */}
        <g className="receptor-glow">
          <rect x="313" y="130" width="10" height="30" rx="3" fill="#4A9B8A"/>
          <circle cx="318" cy="125" r="8" fill="#6ABBA9"/>
        </g>
        <text x="380" y="220" textAnchor="middle" className="cell-label">CD3+ T cell</text>
      </g>

      {/* Exhaustion markers */}
      <g className="exhaustion-markers">
        <g transform="translate(420, 85)" className="marker-fade-1">
          <rect x="-22" y="-10" width="44" height="20" rx="10" fill="#FEE2E2" stroke="#FECACA"/>
          <text x="0" y="4" textAnchor="middle" className="marker-text">PD-1 ↑</text>
        </g>
        <g transform="translate(445, 115)" className="marker-fade-2">
          <rect x="-25" y="-10" width="50" height="20" rx="10" fill="#FEE2E2" stroke="#FECACA"/>
          <text x="0" y="4" textAnchor="middle" className="marker-text">TIM-3 ↑</text>
        </g>
        <g transform="translate(448, 145)" className="marker-fade-3">
          <rect x="-22" y="-10" width="44" height="20" rx="10" fill="#FEE2E2" stroke="#FECACA"/>
          <text x="0" y="4" textAnchor="middle" className="marker-text">LAG-3 ↑</text>
        </g>
        <g transform="translate(445, 175)" className="marker-fade-4">
          <rect x="-22" y="-10" width="44" height="20" rx="10" fill="#FDF2F2" stroke="#FDE8E8"/>
          <text x="0" y="4" textAnchor="middle" className="marker-text-light">TOX+</text>
        </g>
      </g>

      {/* Cytotoxic granules being released */}
      <g className="granules">
        <circle cx="340" cy="120" r="4" fill="#E74C3C" className="granule-1"/>
        <circle cx="350" cy="130" r="3" fill="#E74C3C" className="granule-2"/>
        <circle cx="345" cy="160" r="3.5" fill="#E74C3C" className="granule-3"/>
      </g>

      {/* Pathway box */}
      <g transform="translate(20, 255)">
        <rect width="460" height="20" rx="3" fill="#FEF9E7" stroke="#FCF3CF" strokeWidth="1"/>
        <text x="230" y="14" textAnchor="middle" className="pathway-text">
          Continuous signaling → T cell exhaustion → ↓ Cytotoxicity → Treatment resistance
        </text>
      </g>
    </svg>
  ),

  // Chemokine/G-protein pathway
  chemokine: (
    <svg viewBox="0 0 500 320" className="project-illustration nature-style">
      <defs>
        <linearGradient id="gcCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3A5A8A" />
          <stop offset="100%" stopColor="#2A4A7A" />
        </linearGradient>
        <linearGradient id="escapeCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B3A4A" />
          <stop offset="100%" stopColor="#7B2A3A" />
        </linearGradient>
        <radialGradient id="gcZoneGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8F0F8" />
          <stop offset="70%" stopColor="#D0E0F0" />
          <stop offset="100%" stopColor="#B8D0E8" />
        </radialGradient>
      </defs>

      <rect width="500" height="320" fill="#FAFBFC"/>

      <rect x="0" y="0" width="500" height="32" fill="#F0F2F5"/>
      <text x="250" y="21" textAnchor="middle" className="illustration-title">S1PR2-GNA13-RhoA Pathway: GC Confinement</text>

      {/* Germinal Center Zone */}
      <g className="gc-zone">
        <ellipse cx="140" cy="165" rx="110" ry="100" fill="url(#gcZoneGrad)" className="zone-pulse"/>
        <ellipse cx="140" cy="165" rx="110" ry="100" fill="none" stroke="#7A9ABA" strokeWidth="2" strokeDasharray="8,4"/>
        <text x="140" y="55" textAnchor="middle" className="zone-label">Germinal Center</text>
      </g>

      {/* Normal GC B Cell - confined */}
      <g className="gc-b-cell" filter="url(#cellShadow)">
        <ellipse cx="140" cy="165" rx="35" ry="32" fill="url(#gcCellGrad)" className="cell-pulse"/>
        <ellipse cx="138" cy="168" rx="14" ry="12" fill="#1A3A5A" opacity="0.6"/>
        <text x="140" y="210" textAnchor="middle" className="cell-label-small">GC B cell</text>
        <text x="140" y="222" textAnchor="middle" className="cell-label-small">(Confined)</text>
      </g>

      {/* Signaling cascade - Normal */}
      <g className="pathway-normal" transform="translate(30, 265)">
        <rect x="0" y="0" width="200" height="50" rx="5" fill="#E8F8F0" stroke="#C8E8D8"/>
        <text x="100" y="15" textAnchor="middle" className="pathway-header">Normal Pathway</text>

        <g transform="translate(10, 25)">
          <rect x="0" y="0" width="35" height="18" rx="3" fill="#3A7A6A"/>
          <text x="17" y="13" textAnchor="middle" className="pathway-node">S1PR2</text>
        </g>
        <path d="M50 34 L60 34" stroke="#2A6A5A" strokeWidth="2" className="arrow-flow" markerEnd="url(#arrowGreen)"/>

        <g transform="translate(65, 25)">
          <rect x="0" y="0" width="35" height="18" rx="3" fill="#4A8A7A"/>
          <text x="17" y="13" textAnchor="middle" className="pathway-node">Gα13</text>
        </g>
        <path d="M105 34 L115 34" stroke="#2A6A5A" strokeWidth="2" className="arrow-flow-2" markerEnd="url(#arrowGreen)"/>

        <g transform="translate(120, 25)">
          <rect x="0" y="0" width="35" height="18" rx="3" fill="#5A9A8A"/>
          <text x="17" y="13" textAnchor="middle" className="pathway-node">RhoA</text>
        </g>
        <path d="M160 34 L170 34" stroke="#2A6A5A" strokeWidth="2" className="arrow-flow-3"/>
        <text x="185" y="38" className="pathway-result">✓</text>
      </g>

      {/* Divider */}
      <line x1="250" y1="60" x2="250" y2="310" stroke="#D0D8E0" strokeWidth="1" strokeDasharray="4,4"/>

      {/* Mutant side - dissemination */}
      <g className="dissemination-zone">
        <text x="375" y="55" textAnchor="middle" className="zone-label-mut">GNA13/RHOA Mutant</text>

        {/* Escaping cells with animation */}
        <g className="escaping-cells">
          <ellipse cx="300" cy="130" rx="22" ry="20" fill="url(#escapeCellGrad)" className="escape-cell-1"/>
          <ellipse cx="340" cy="160" rx="22" ry="20" fill="url(#escapeCellGrad)" className="escape-cell-2"/>
          <ellipse cx="380" cy="130" rx="22" ry="20" fill="url(#escapeCellGrad)" className="escape-cell-3"/>
          <ellipse cx="420" cy="170" rx="22" ry="20" fill="url(#escapeCellGrad)" className="escape-cell-4"/>
          <ellipse cx="360" cy="200" rx="22" ry="20" fill="url(#escapeCellGrad)" className="escape-cell-5"/>
        </g>

        {/* Migration arrows */}
        <g className="migration-arrows">
          <path d="M280 100 Q320 80 350 90" stroke="#C84A5A" strokeWidth="2" fill="none" className="migrate-arrow-1" markerEnd="url(#arrowRed)"/>
          <path d="M290 150 Q350 130 400 140" stroke="#C84A5A" strokeWidth="2" fill="none" className="migrate-arrow-2" markerEnd="url(#arrowRed)"/>
          <path d="M300 190 Q370 200 430 180" stroke="#C84A5A" strokeWidth="2" fill="none" className="migrate-arrow-3" markerEnd="url(#arrowRed)"/>
        </g>

        <text x="375" y="240" textAnchor="middle" className="cell-label">Systemic</text>
        <text x="375" y="253" textAnchor="middle" className="cell-label">Dissemination</text>
      </g>

      {/* Mutant pathway */}
      <g className="pathway-mutant" transform="translate(270, 265)">
        <rect x="0" y="0" width="200" height="50" rx="5" fill="#FDF2F2" stroke="#FADBD8"/>
        <text x="100" y="15" textAnchor="middle" className="pathway-header-mut">Mutant Pathway</text>

        <g transform="translate(10, 25)">
          <rect x="0" y="0" width="35" height="18" rx="3" fill="#7A4A5A"/>
          <text x="17" y="13" textAnchor="middle" className="pathway-node-mut">S1PR2</text>
        </g>
        <path d="M50 34 L60 34" stroke="#8A5A6A" strokeWidth="2" strokeDasharray="3,2"/>

        <g transform="translate(65, 25)" className="mutation-x">
          <rect x="0" y="0" width="35" height="18" rx="3" fill="#9A6A7A" opacity="0.5"/>
          <text x="17" y="13" textAnchor="middle" className="pathway-node-mut">Gα13</text>
          <path d="M5 3 L30 15 M30 3 L5 15" stroke="#C84A5A" strokeWidth="2"/>
        </g>
        <path d="M105 34 L115 34" stroke="#8A5A6A" strokeWidth="2" strokeDasharray="3,2"/>

        <g transform="translate(120, 25)">
          <rect x="0" y="0" width="35" height="18" rx="3" fill="#9A6A7A" opacity="0.5"/>
          <text x="17" y="13" textAnchor="middle" className="pathway-node-mut">RhoA</text>
        </g>
        <path d="M160 34 L170 34" stroke="#8A5A6A" strokeWidth="2"/>
        <text x="185" y="38" className="pathway-result-fail">✗</text>
      </g>

      {/* Arrow markers */}
      <defs>
        <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L0,8 L8,4 z" fill="#2A6A5A"/>
        </marker>
        <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L0,8 L8,4 z" fill="#C84A5A"/>
        </marker>
      </defs>
    </svg>
  ),

  // Microbiome - Moraxella NLPHL
  microbe: (
    <svg viewBox="0 0 500 300" className="project-illustration nature-style">
      <defs>
        <linearGradient id="lpCellGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8A6A3A" />
          <stop offset="50%" stopColor="#9A7A4A" />
          <stop offset="100%" stopColor="#7A5A2A" />
        </linearGradient>
        <linearGradient id="tfhCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7A3A6A" />
          <stop offset="100%" stopColor="#6A2A5A" />
        </linearGradient>
        <linearGradient id="bacteriaGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5A8A4A" />
          <stop offset="100%" stopColor="#4A7A3A" />
        </linearGradient>
        <radialGradient id="glowEffect" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width="500" height="300" fill="#FAFBFC"/>

      <rect x="0" y="0" width="500" height="32" fill="#F0F2F5"/>
      <text x="250" y="21" textAnchor="middle" className="illustration-title">Moraxella-IgD Interaction in NLPHL Pathogenesis</text>

      {/* LP "Popcorn" Cell */}
      <g className="lp-cell" filter="url(#cellShadow)">
        {/* Irregular popcorn shape */}
        <path d="M80 150
                 Q60 120 85 95
                 Q110 70 140 85
                 Q170 65 185 100
                 Q210 90 210 130
                 Q225 160 200 185
                 Q210 215 175 220
                 Q150 240 115 225
                 Q80 230 70 200
                 Q45 180 80 150"
              fill="url(#lpCellGrad2)" className="cell-morph"/>
        {/* Multi-lobed nucleus */}
        <ellipse cx="120" cy="145" rx="25" ry="20" fill="#5A3A1A" opacity="0.5"/>
        <ellipse cx="150" cy="155" rx="20" ry="18" fill="#5A3A1A" opacity="0.4"/>
        <ellipse cx="135" cy="170" rx="18" ry="15" fill="#5A3A1A" opacity="0.3"/>

        {/* IgD BCR on surface */}
        <g className="igd-receptor" transform="translate(200, 130)">
          <path d="M0 0 L0 -20 L-12 -35 M0 -20 L12 -35" stroke="#C4A43B" strokeWidth="4" fill="none" strokeLinecap="round" className="receptor-pulse"/>
          <circle cx="-12" cy="-40" r="6" fill="#D4B44B"/>
          <circle cx="12" cy="-40" r="6" fill="#D4B44B"/>
        </g>

        <text x="135" y="260" textAnchor="middle" className="cell-label">LP "Popcorn" Cell</text>
        <text x="135" y="273" textAnchor="middle" className="cell-label-sub">(IgD+ NLPHL)</text>
      </g>

      {/* Moraxella bacterium */}
      <g className="bacteria" transform="translate(240, 75)">
        <ellipse cx="0" cy="0" rx="40" ry="18" fill="url(#bacteriaGrad2)" className="bacteria-float"/>
        {/* Surface proteins */}
        <g className="pili">
          <line x1="-40" y1="0" x2="-55" y2="-8" stroke="#6A9A5A" strokeWidth="2" strokeLinecap="round"/>
          <line x1="-38" y1="5" x2="-52" y2="12" stroke="#6A9A5A" strokeWidth="2" strokeLinecap="round"/>
          <line x1="40" y1="0" x2="55" y2="-5" stroke="#6A9A5A" strokeWidth="2" strokeLinecap="round"/>
          <line x1="38" y1="5" x2="52" y2="10" stroke="#6A9A5A" strokeWidth="2" strokeLinecap="round"/>
        </g>
        {/* MID/Hag protein */}
        <g className="mid-protein">
          <rect x="-12" y="15" width="24" height="12" rx="3" fill="#8ABA7A"/>
          <path d="M0 27 L0 50" stroke="#8ABA7A" strokeWidth="3" className="binding-line"/>
          <circle cx="0" cy="55" r="5" fill="#9ACA8A" className="binding-site"/>
        </g>
        <text x="0" y="-25" textAnchor="middle" className="bacteria-label">Moraxella catarrhalis</text>
        <text x="0" y="75" textAnchor="middle" className="protein-label">MID/Hag protein</text>
      </g>

      {/* Binding interaction */}
      <g className="binding-interaction">
        <line x1="212" y1="115" x2="240" y2="100" stroke="#E74C3C" strokeWidth="2" strokeDasharray="4,2" className="binding-pulse"/>
        <text x="245" y="115" className="interaction-label">BCR cross-linking</text>
      </g>

      {/* Tfh Cells (rosetting) */}
      <g className="tfh-rosette">
        <g className="tfh-1" transform="translate(320, 140)">
          <ellipse cx="0" cy="0" rx="30" ry="28" fill="url(#tfhCellGrad)" className="tfh-pulse-1"/>
          <ellipse cx="2" cy="2" rx="12" ry="10" fill="#4A1A3A" opacity="0.5"/>
          <text x="0" y="5" textAnchor="middle" className="tfh-label">Tfh</text>
        </g>
        <g className="tfh-2" transform="translate(360, 180)">
          <ellipse cx="0" cy="0" rx="28" ry="26" fill="url(#tfhCellGrad)" className="tfh-pulse-2"/>
          <ellipse cx="2" cy="2" rx="11" ry="9" fill="#4A1A3A" opacity="0.5"/>
          <text x="0" y="5" textAnchor="middle" className="tfh-label">Tfh</text>
        </g>
        <g className="tfh-3" transform="translate(310, 200)">
          <ellipse cx="0" cy="0" rx="26" ry="24" fill="url(#tfhCellGrad)" className="tfh-pulse-3"/>
          <ellipse cx="2" cy="2" rx="10" ry="8" fill="#4A1A3A" opacity="0.5"/>
          <text x="0" y="5" textAnchor="middle" className="tfh-label">Tfh</text>
        </g>
      </g>

      {/* Survival signals */}
      <g className="survival-signals" transform="translate(260, 160)">
        <g className="signal-1">
          <path d="M0 0 L-25 10" stroke="#9A4A8A" strokeWidth="2" className="signal-flow-1"/>
          <circle cx="-28" cy="11" r="4" fill="#AA5A9A"/>
        </g>
        <g className="signal-2">
          <path d="M5 15 L-20 30" stroke="#9A4A8A" strokeWidth="2" className="signal-flow-2"/>
          <circle cx="-23" cy="32" r="4" fill="#AA5A9A"/>
        </g>
        <g className="signal-3">
          <path d="M-5 30 L-30 45" stroke="#9A4A8A" strokeWidth="2" className="signal-flow-3"/>
          <circle cx="-33" cy="47" r="4" fill="#AA5A9A"/>
        </g>

        {/* Signal labels */}
        <g transform="translate(15, 5)">
          <text x="0" y="0" className="signal-label">IL-4</text>
          <text x="0" y="15" className="signal-label">IL-21</text>
          <text x="0" y="30" className="signal-label">CD40L</text>
        </g>
      </g>

      {/* Pathway box */}
      <g transform="translate(20, 275)">
        <rect width="460" height="20" rx="3" fill="#F0F8F0" stroke="#D0E8D0" strokeWidth="1"/>
        <text x="230" y="14" textAnchor="middle" className="pathway-text">
          Chronic BCR stimulation → Tfh recruitment → Survival signals → Lymphomagenesis
        </text>
      </g>
    </svg>
  )
};

// Small icons for headers (unchanged)
const ProjectIcons = {
  tp53: (
    <svg viewBox="0 0 64 64" className="project-icon">
      <defs>
        <linearGradient id="tp53IconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B2942" />
          <stop offset="100%" stopColor="#A13553" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#tp53IconGrad)"/>
      <path d="M24 28 L40 44 M40 28 L24 44" stroke="#FFD93D" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  ),
  bite: (
    <svg viewBox="0 0 64 64" className="project-icon">
      <defs>
        <linearGradient id="biteIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B4A8A" />
          <stop offset="100%" stopColor="#1A6B5A" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="32" r="14" fill="#5B4A8A"/>
      <circle cx="44" cy="32" r="14" fill="#1A6B5A"/>
      <rect x="26" y="28" width="12" height="8" rx="2" fill="#D4A84B"/>
    </svg>
  ),
  chemokine: (
    <svg viewBox="0 0 64 64" className="project-icon">
      <defs>
        <linearGradient id="chemIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3A5A8A" />
          <stop offset="100%" stopColor="#2A4A7A" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="32" r="16" fill="url(#chemIconGrad)"/>
      <circle cx="44" cy="24" r="8" fill="#8B3A4A" className="escape-dot"/>
      <circle cx="48" cy="38" r="6" fill="#8B3A4A" opacity="0.7"/>
      <path d="M36 28 L42 22" stroke="#C84A5A" strokeWidth="2" markerEnd="url(#arrowRed)"/>
    </svg>
  ),
  microbe: (
    <svg viewBox="0 0 64 64" className="project-icon">
      <defs>
        <linearGradient id="microbeIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8A6A3A" />
          <stop offset="100%" stopColor="#9A7A4A" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="36" rx="20" ry="16" fill="url(#microbeIconGrad)"/>
      <ellipse cx="32" cy="20" rx="12" ry="8" fill="#5A8A4A"/>
      <line x1="32" y1="28" x2="32" y2="32" stroke="#8ABA7A" strokeWidth="2"/>
    </svg>
  )
};

function Projects() {
  const [expandedProject, setExpandedProject] = useState(null);

  const researchProjects = [
    {
      id: 1,
      title: 'TP53 Loss-of-Function in DLBCL',
      subtitle: 'Immune Escape Mechanisms',
      icon: 'tp53',
      hypothesis: 'TP53 mutation is not just a cell-cycle defect; it actively remodels the immune microenvironment to create a "cold" tumor that resists T-cell killing.',
      mechanisms: [
        {
          name: 'MHC-I Downregulation',
          detail: 'Wild-type p53 drives expression of MHC Class I antigen-processing machinery (TAP1, ERAP1). In TP53-mutant DLBCL, this machinery is downregulated, effectively cloaking tumor cells from CD8+ T-cell recognition.'
        },
        {
          name: 'Senescence & SASP Failure',
          detail: 'DNA damage normally induces senescence, causing cells to secrete inflammatory cytokines (SASP) that recruit immune clearance. TP53 loss bypasses senescence, silencing this "eat me" signal.'
        },
        {
          name: 'Aneuploidy & cGAS-STING Suppression',
          detail: 'TP53 loss (often linked to tetraploidy) correlates with high chromosomal instability. Paradoxically, this high mutational burden does not attract T-cells, likely due to simultaneous suppression of cGAS-STING signaling.'
        }
      ],
      insights: [
        'Mutations concentrate in DNA-binding domain (exons 5-8), hotspots: R175, G245, R248, R273, R282',
        'Missense mutations dominate, causing loss of function or dominant-negative effects',
        'TP53-mutant tumors often co-occur with complex karyotype and therapy resistance'
      ],
      translationalGoal: 'Re-sensitizing tumors to immune attack (BiTEs/CAR-T) by upregulating MHC-I using epigenetic modifiers, or bypassing the MHC requirement using NK cells or non-MHC targets.',
      approaches: ['Immune Profiling', 'Epigenetic Modifiers', 'MHC-I Restoration', 'cGAS-STING Analysis'],
      status: 'Active'
    },
    {
      id: 2,
      title: 'BiTE Therapy Optimization',
      subtitle: 'Translational Model Development',
      icon: 'bite',
      hypothesis: 'The efficacy of Bispecific T-cell Engagers (BiTEs) in B-cell lymphoma is limited by T-cell exhaustion and the "antigen sink" of healthy B-cells, rather than tumor-intrinsic resistance alone.',
      mechanisms: [
        {
          name: 'The "Sink" Effect',
          detail: 'The vast reservoir of healthy CD19+/CD20+ B-cells in spleen and blood absorbs the drug before it penetrates the lymph node/tumor, requiring higher dosing that drives toxicity.'
        },
        {
          name: 'T-Cell Exhaustion',
          detail: 'Continuous signaling from BiTEs (unlike pulsatile signaling in natural infection) drives T-cells into a terminal exhaustion state (TOX+, PD-1 high, TIM-3 high).'
        },
        {
          name: 'Model Limitations',
          detail: 'Accurately modeling human T-cell exhaustion profiles requires careful selection between humanized mice (NSG-SGM3) and syngeneic models.'
        }
      ],
      insights: [
        'Dark zone-like GCB-DLBCL shows immune-cold TME with poor T-cell engagement',
        'DZ signature tumors may predict relative resistance to CD20×CD3 bispecifics',
        'Epigenetic modifiers (SETDB1, KMT2D mutations) can affect BiTE sensitivity'
      ],
      translationalGoal: 'Optimize BiTE efficacy through intermittent "on/off" dosing cycles for T-cell metabolic recovery, and combination strategies with STING agonists or 4-1BB agonists.',
      approaches: ['Humanized Mouse Models', 'T-cell Exhaustion Profiling', 'Combination Immunotherapy', 'Dosing Optimization'],
      status: 'Active'
    },
    {
      id: 3,
      title: 'Chemokine & G-Protein Mutations',
      subtitle: 'Lymphoma Dissemination',
      icon: 'chemokine',
      hypothesis: 'Mutations in the S1PR2 → Gα13 → RhoA axis disable the "confinement" signal in Germinal Center B-cells, allowing them to adopt an amoeboid phenotype and disseminate.',
      mechanisms: [
        {
          name: 'Retention Signal (Stay)',
          detail: 'S1PR2 binds S1P → activates Gα13 → activates RhoA → activates ROCK → Actomyosin contraction. This keeps cells round and confined in the germinal center.'
        },
        {
          name: 'Dissemination Signal (Go)',
          detail: 'S1PR1 and CXCR4 activate Gαi → activates Rac1, promoting migration and egress from the germinal center.'
        },
        {
          name: 'Mutation Consequence',
          detail: 'In GCB-DLBCL and Burkitt Lymphoma, loss-of-function mutations in GNA13 or RHOA break the retention anchor. Cells shift to Rac1-driven migratory state, leading to systemic dissemination.'
        }
      ],
      insights: [
        'GNA13 inactivating mutations occur in 15-30% of GC-derived DLBCLs (especially EZB subtype)',
        'GNA13, GNAI2, and RHOA mutations cluster within the same signaling axis',
        'Loss creates dark-zone-locked, invasive, immune-cold phenotype',
        'Mutations disrupt GC confinement, enabling dissemination and lymphoma progression'
      ],
      translationalGoal: 'Develop S1PR2 agonists or S1PR1 antagonists to restore germinal center confinement; use ROCK inhibitors to validate mechanism in vitro.',
      approaches: ['G-protein Signaling', 'Migration Assays', 'S1P Pathway Modulation', 'In Vivo Dissemination Models'],
      status: 'Active'
    },
    {
      id: 4,
      title: 'Microbial Drivers of NLPHL',
      subtitle: 'Moraxella & Indolent Lymphoma',
      icon: 'microbe',
      hypothesis: 'Chronic antigenic stimulation by Moraxella catarrhalis drives the pathogenesis of Nodular Lymphocyte-Predominant Hodgkin Lymphoma (NLPHL), analogous to H. pylori in MALT lymphoma.',
      mechanisms: [
        {
          name: 'IgD BCR Retention',
          detail: 'The unique Lymphocyte Predominant (LP) "popcorn" cells in NLPHL frequently retain IgD expression, unlike classical Hodgkin cells.'
        },
        {
          name: 'Superantigen Effect',
          detail: 'The MID/Hag protein on Moraxella surface binds specifically to the variable region of IgD BCRs, providing chronic BCR cross-linking.'
        },
        {
          name: 'T-cell Recruitment & Survival',
          detail: 'Chronic BCR stimulation leads LP cells to recruit T-follicular helper (Tfh) cells (rosetting), which provide survival signals (IL-4, IL-21, CD40L) preventing tumor cell death.'
        }
      ],
      insights: [
        'NLPHL LP cells uniquely retain IgD expression - a key diagnostic feature',
        'Moraxella MID/Hag acts as superantigen for IgD-expressing B cells',
        'Tfh rosetting provides critical survival signals analogous to GC microenvironment',
        'Paradigm parallels H. pylori-driven gastric MALT lymphoma'
      ],
      translationalGoal: 'Investigate antibiotics or antigen-blocking strategies in early-stage or relapsed NLPHL, challenging "watch and wait" or radiation-only paradigms.',
      approaches: ['Microbiome Analysis', 'BCR Sequencing', 'Tfh Interactions', 'Clinical Correlates'],
      status: 'Active'
    }
  ];

  const toggleExpand = (id) => {
    setExpandedProject(expandedProject === id ? null : id);
  };

  return (
    <section id="projects" className="projects">
      <div className="container">
        <h2 className="section-title">Current Research</h2>
        <p className="projects-intro">
          As a Lymphoma fellow at the University of Chicago, my research program bridges
          bench and bedside—investigating immune escape mechanisms and developing strategies
          to improve outcomes for patients receiving immunotherapies like BiTEs and CAR-T.
        </p>
        <div className="projects-list">
          {researchProjects.map((project) => (
            <article
              key={project.id}
              className={`research-card ${expandedProject === project.id ? 'expanded' : ''}`}
            >
              <div className="research-card-header" onClick={() => toggleExpand(project.id)}>
                <div className="research-card-icon">
                  {ProjectIcons[project.icon]}
                </div>
                <div className="research-card-title-section">
                  <span className="project-number">Project {project.id}</span>
                  <h3 className="research-card-title">{project.title}</h3>
                  <p className="research-card-subtitle">{project.subtitle}</p>
                </div>
                <button className="expand-btn" aria-label="Toggle details">
                  {expandedProject === project.id ? '−' : '+'}
                </button>
              </div>

              <div className="research-card-body">
                <div className="hypothesis-section">
                  <h4>Core Hypothesis</h4>
                  <p className="hypothesis-text">{project.hypothesis}</p>
                </div>

                {expandedProject === project.id && (
                  <div className="expanded-content">
                    <div className="illustration-section">
                      <h4>Mechanistic Model</h4>
                      <div className="illustration-container">
                        {ProjectIllustrations[project.icon]}
                      </div>
                    </div>

                    <div className="mechanisms-section">
                      <h4>Key Mechanisms</h4>
                      {project.mechanisms.map((mech, index) => (
                        <div key={index} className="mechanism-item">
                          <h5>{mech.name}</h5>
                          <p>{mech.detail}</p>
                        </div>
                      ))}
                    </div>

                    <div className="insights-section">
                      <h4>Research Insights</h4>
                      <ul className="insights-list">
                        {project.insights.map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="translational-section">
                      <h4>Translational Goal</h4>
                      <p>{project.translationalGoal}</p>
                    </div>
                  </div>
                )}

                <ul className="project-tech">
                  {project.approaches.map((approach, index) => (
                    <li key={index}>{approach}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        {/* Educational Games Section */}
        <div className="educational-games-section">
          <h3 className="games-section-title">Educational Games</h3>
          <p className="games-intro">
            Interactive learning tools for hematology education, featuring gamified approaches
            to mastering blood smear morphology and clinical reasoning.
          </p>
          <a
            href="/HematologyArcade/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="arcade-link-card"
          >
            <div className="arcade-icon">
              <svg viewBox="0 0 64 64" className="project-icon arcade-icon-svg">
                <rect x="8" y="16" width="48" height="40" rx="4" fill="#2D1B4E"/>
                <rect x="12" y="20" width="40" height="24" rx="2" fill="#1a1a2e"/>
                <circle cx="20" cy="32" r="6" fill="#E74C3C"/>
                <circle cx="32" cy="32" r="6" fill="#F39C12"/>
                <circle cx="44" cy="32" r="6" fill="#27AE60"/>
                <rect x="16" y="48" width="8" height="4" rx="1" fill="#555"/>
                <rect x="28" y="48" width="8" height="4" rx="1" fill="#555"/>
                <rect x="40" y="48" width="8" height="4" rx="1" fill="#555"/>
                <text x="32" y="14" textAnchor="middle" fill="#F39C12" fontSize="8" fontWeight="bold">ARCADE</text>
              </svg>
            </div>
            <div className="arcade-link-content">
              <h4 className="arcade-title">Hematology Arcade</h4>
              <p className="arcade-description">
                A collection of retro-styled educational games including MyelomaMan, Ms. AML-Man,
                LymphoMaster, and Heme's Waldo - learn hematology while having fun!
              </p>
              <span className="arcade-cta">Play Now →</span>
            </div>
          </a>

          {/* Lab Tycoon */}
          <a
            href="/LabTycoon/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="arcade-link-card"
            style={{ marginTop: '1rem' }}
          >
            <div className="arcade-icon">
              <svg viewBox="0 0 64 64" className="project-icon arcade-icon-svg">
                <rect x="8" y="8" width="48" height="48" rx="4" fill="#1a1a2e"/>
                <path d="M20 20 L20 40 L28 52 L36 52 L44 40 L44 20" stroke="#4ecdc4" strokeWidth="3" fill="none"/>
                <ellipse cx="32" cy="44" rx="8" ry="4" fill="#ff6b6b" opacity="0.6"/>
                <circle cx="26" cy="32" r="3" fill="#ffd93d"/>
                <circle cx="38" cy="28" r="2" fill="#4ecdc4"/>
                <circle cx="32" cy="36" r="2.5" fill="#ff6b6b"/>
                <text x="32" y="60" textAnchor="middle" fill="#666666" fontSize="6">BETA</text>
              </svg>
            </div>
            <div className="arcade-link-content">
              <h4 className="arcade-title">Lab Tycoon: Academic Survival Simulator</h4>
              <p className="arcade-description">
                A Dark Satire (read: accurate simulation) of Lab Management. Navigate grant rejections,
                manage burned-out postdocs, survive DOGE audits, and try not to cry.
                <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#888' }}>
                  v0.1 BETA - AI Slop Game in Development
                </span>
              </p>
              <span className="arcade-cta">Enter Academia →</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

export default Projects;
