import { Scene } from "phaser";

export class BootScene extends Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Just a quick loading setup or single spinner
  }

  create() {
    // scale configuration
    this.scale.setGameSize(1024, 600);
    this.scale.autoRound = true;

    // Start loading resources
    this.scene.start("PreloadScene");
  }
}
