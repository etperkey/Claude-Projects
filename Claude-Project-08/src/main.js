import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import DiagnosisScene from './scenes/DiagnosisScene.js';
import GameScene from './scenes/GameScene.js';
import InsuranceScene from './scenes/InsuranceScene.js';
import TreatmentScene from './scenes/TreatmentScene.js';
import BillingScene from './scenes/BillingScene.js';
import EndingScene from './scenes/EndingScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [
    BootScene,
    MenuScene,
    DiagnosisScene,
    GameScene,
    InsuranceScene,
    TreatmentScene,
    BillingScene,
    EndingScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);
