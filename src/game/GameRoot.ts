import { Game } from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

export function createGame(parentID: string): Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentID,
    backgroundColor: '#e8f4fd',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1024,
      height: 600
    },
    audio: {
      noAudio: true
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 0.95 },
        debug: false, // Set to true to view wireframe meshes on debugging
        setBounds: {
          left: true,
          right: true,
          top: false, // Let projectiles fly high dynamically!
          bottom: true
        }
      }
    },
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      LevelSelectScene,
      GameScene,
      ResultScene
    ]
  };

  return new Game(config);
}
