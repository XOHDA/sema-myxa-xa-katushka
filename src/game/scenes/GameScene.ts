import Phaser from 'phaser';
import { generateGameTextures } from '../textures';
import { soundManager } from '../../audio/soundManager';
import { InputState, LevelConfig, PlayerStats } from '../../types';
import { RU } from '../../localization/ru';

export class GameScene extends Phaser.Scene {
  private levelConfig: LevelConfig;
  private onStatsUpdate: (stats: PlayerStats) => void;
  private onGameOver: () => void;
  private onVictory: () => void;
  private inputState: InputState = {
    left: false,
    right: false,
    jump: false,
    boost: false,
    down: false,
  };

  // Player & EUC
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerWheelLight!: Phaser.GameObjects.Arc;
  private headlightBeam!: Phaser.GameObjects.Polygon;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // State variables
  private shields = 3;
  private maxShields = 3;
  private battery = 100;
  private score = 0;
  private voltsCollected = 0;
  private distance = 0;
  private tricksCount = 0;
  private fallsCount = 0;
  private combo = 1;
  private elapsedTime = 0;

  private isInvulnerable = false;
  private isBoosting = false;
  private isSuperBoost = false;
  private superBoostTimer = 0;
  private speedKmh = 0;
  private maxSpeedKmh = 0;
  private avgSpeedKmh = 0;
  private speedSamplesSum = 0;
  private speedSamplesCount = 0;
  private currentPwm = 0;
  private maxPwm = 0;
  private isCutout = false;
  private cutoutReason: 'speed' | 'boost' | undefined = undefined;
  private boostHoldDuration = 0;
  private boostWarningTimer = 0;
  private isOverspeed = false;
  private overspeedBeepTimer = 0;
  private isWobbling = false;
  private wobbleTimer = 0;
  private nextWobbleDistance = 350;
  private isGameOver = false;
  private isVictory = false;
  private isSceneReady = false;
  private skeletonTimer: Phaser.Time.TimerEvent | null = null;
  private gameOverTimer: Phaser.Time.TimerEvent | null = null;
  private victoryTimer: Phaser.Time.TimerEvent | null = null;

  // Air & trick tracking
  private isAirborne = false;
  private airStartTime = 0;
  private airStartX = 0;
  private airStartY = 0;
  private airRotationTotal = 0;
  private lastAngle = 0;

  // Checkpoints
  private lastCheckpointX = 120;
  private lastCheckpointY = 540;

  // Physics groups
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private ramps!: Phaser.Physics.Arcade.StaticGroup;
  private voltTokens!: Phaser.Physics.Arcade.StaticGroup;
  private batteries!: Phaser.Physics.Arcade.StaticGroup;
  private chargingStations!: Phaser.Physics.Arcade.StaticGroup;
  private lightningPickups!: Phaser.Physics.Arcade.StaticGroup;
  private checkpoints!: Phaser.Physics.Arcade.StaticGroup;
  private lastChargingStationX = 0;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private puddles!: Phaser.Physics.Arcade.StaticGroup;
  private finishZone!: Phaser.GameObjects.Zone;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drones!: Phaser.Physics.Arcade.Group;
  private poopProjectiles!: Phaser.Physics.Arcade.Group;

  // State
  private isCrouching = false;
  private isTiltback = false;
  private tiltbackBeepTimer = 0;
  private tiltbackSpeechTimer = 0;

  // Visuals & Sky
  private skyLayer!: Phaser.GameObjects.Rectangle;
  private bgCityLayer!: Phaser.GameObjects.Graphics;
  private weatherParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private finishArch!: Phaser.GameObjects.Image;
  private speechText: Phaser.GameObjects.Text | null = null;
  private speechTimer = 0;
  private activeSpeechString: string | null = null;
  private trickPopupString: string | null = null;

  constructor(
    levelConfig: LevelConfig,
    onStatsUpdate: (stats: PlayerStats) => void,
    onGameOver: () => void,
    onVictory: () => void
  ) {
    super({ key: 'GameScene' });
    this.levelConfig = levelConfig;
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;
    this.onVictory = onVictory;
  }

  public setInputState(input: InputState) {
    if (this.isGameOver || this.isVictory) {
      this.inputState = { left: false, right: false, jump: false, boost: false, down: false };
      this.isBoosting = false;
      return;
    }
    this.inputState = { ...input };
  }

  public preload() {
    // Generate procedural canvas textures
    generateGameTextures(this);
  }

  public create() {
    const worldWidth = this.levelConfig.length;
    const worldHeight = 800;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. SKY & PARALLAX BACKGROUND
    this.skyLayer = this.add
      .rectangle(0, 0, 450, 800, 0x38bdf8)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.bgCityLayer = this.add.graphics().setScrollFactor(0.2);
    this.drawCitySkyline(this.bgCityLayer, worldWidth);

    // Weather particle effect for storm levels
    if (this.levelConfig.theme === 'storm') {
      this.weatherParticles = this.add.particles(0, 0, 'particle_volt', {
        x: { min: -100, max: 550 },
        y: -20,
        quantity: 3,
        lifespan: 1200,
        gravityY: 600,
        speedX: { min: -150, max: -80 },
        speedY: { min: 450, max: 650 },
        scale: { start: 0.4, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        tint: 0x93c5fd,
      });
      this.weatherParticles.setScrollFactor(0);
      this.weatherParticles.setDepth(6);
    }

    // 2. CREATE GROUPS
    this.platforms = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();
    this.ramps = this.physics.add.staticGroup();
    this.voltTokens = this.physics.add.staticGroup();
    this.batteries = this.physics.add.staticGroup();
    this.chargingStations = this.physics.add.staticGroup();
    this.lightningPickups = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();
    this.obstacles = this.physics.add.staticGroup();
    this.puddles = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.drones = this.physics.add.group();
    this.poopProjectiles = this.physics.add.group();

    // 3. CREATE PLAYER SÉMA MUKHA-KHA FIRST (Must precede buildLevel and colliders)
    // Scaled to 0.72: compact, nimble, fits under all overhead bridges, signs, and arches!
    this.player = this.physics.add.sprite(120, 540, 'sema_normal');
    this.player.setScale(0.72);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.04);
    // Physics body tightly around EUC wheel contact point (width: 48, height: 120, offset: 61, 105)
    this.player.setSize(48, 120);
    this.player.setOffset(61, 105);
    this.player.setDepth(10);

    // Headlight polygon attached to Sema's EUC
    this.headlightBeam = this.add.polygon(
      0,
      0,
      [
        { x: 0, y: 0 },
        { x: 160, y: -40 },
        { x: 160, y: 50 },
      ],
      0xfef08a,
      0.22
    );
    this.headlightBeam.setScale(0.72);
    this.headlightBeam.setDepth(9);

    // Wheel glow orb
    this.playerWheelLight = this.add.circle(0, 0, 20, 0xf59e0b, 0.4);
    this.playerWheelLight.setDepth(11);

    // Particle emitter for speed boost / wheel sparks
    const sparkGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    sparkGraphics.fillStyle(0xfbbf24, 1);
    sparkGraphics.fillCircle(4, 4, 4);
    sparkGraphics.generateTexture('particle_spark', 8, 8);

    this.trailEmitter = this.add.particles(0, 0, 'particle_spark', {
      speed: { min: 20, max: 100 },
      angle: { min: 160, max: 200 },
      scale: { start: 1.0, end: 0 },
      lifespan: 350,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.trailEmitter.setDepth(8);

    // 4. BUILD LEVEL GEOMETRY & ENTITIES (Continuous solid road, no gaps)
    this.buildLevel(worldWidth);

    // 5. COLLISIONS & OVERLAPS
    this.physics.add.collider(this.player, this.platforms, this.handlePlayerLand, undefined, this);
    // Enemies are road-locked with lockedY and zero gravity so they never fall through tile seams

    // One-way elevated platforms (bridges/scaffolds) - player passes through freely from below and sides!
    this.physics.add.collider(
      this.player,
      this.elevatedPlatforms,
      this.handlePlayerLand,
      (playerObj, platformObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        const plat = platformObj as Phaser.Physics.Arcade.Sprite;
        const pBody = p.body as Phaser.Physics.Arcade.Body;
        const platBody = plat.body as Phaser.Physics.Arcade.StaticBody;
        // Only land if player's wheel is falling from above onto the platform surface
        return pBody.velocity.y >= 0 && pBody.bottom <= platBody.top + 26;
      },
      this
    );

    // Ramp overlap: launching
    this.physics.add.overlap(this.player, this.ramps, this.handleRampLaunch, undefined, this);

    // Item Pickups
    this.physics.add.overlap(this.player, this.voltTokens, this.handleCollectVolt, undefined, this);
    this.physics.add.overlap(this.player, this.batteries, this.handleCollectBattery, undefined, this);
    this.physics.add.overlap(this.player, this.chargingStations, this.handleUseChargingStation, undefined, this);
    this.physics.add.overlap(this.player, this.lightningPickups, this.handleCollectLightning, undefined, this);
    this.physics.add.overlap(this.player, this.checkpoints, this.handleActivateCheckpoint, undefined, this);

    // Hazards & Obstacles
    this.physics.add.overlap(this.player, this.obstacles, this.handleHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.drones, this.handleHitDrone, undefined, this);
    this.physics.add.overlap(this.player, this.poopProjectiles, this.handleHitPoop, undefined, this);
    this.physics.add.overlap(this.player, this.puddles, this.handlePuddleSlip, undefined, this);
    if (this.finishZone) {
      this.physics.add.overlap(this.player, this.finishZone, () => {
        if (!this.isVictory && !this.isGameOver && this.player.x >= worldWidth - 600) {
          this.handleFinish();
        }
      });
    }

    // 6. CAMERA SETUP (Grounded view: road always visible at bottom, skyline above)
    this.cameras.main.setBounds(0, 0, worldWidth, 800);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.08, -80, 20);
    this.cameras.main.setZoom(1.0);

    // Sound initialization
    soundManager.startMotor();
    soundManager.startMusic();

    this.triggerSpeech(RU.phrases[0]); // «КАТАААТЬ!»
    this.isSceneReady = true;
  }

  private drawCitySkyline(graphics: Phaser.GameObjects.Graphics, width: number) {
    graphics.clear();
    const theme = this.levelConfig.theme;
    const levelId = this.levelConfig.id;

    // A. PARK & EMBANKMENT LANDSCAPE (Level 1, 4, 15)
    if (levelId === 1 || levelId === 4 || levelId === 15) {
      // Park trees, river reflections, bridges and gentle street lamps
      // Distant rolling green hills / riverbank silhouettes
      graphics.fillStyle(0x064e3b, 0.45);
      graphics.beginPath();
      graphics.moveTo(0, 650);
      for (let x = 0; x <= width; x += 160) {
        const hillH = 140 + Math.sin(x * 0.003) * 60;
        graphics.lineTo(x, 650 - hillH);
      }
      graphics.lineTo(width, 650);
      graphics.closePath();
      graphics.fill();

      // Lush pine and park oak silhouettes
      let tx = 30;
      while (tx < width) {
        const treeH = Phaser.Math.Between(110, 220);
        const treeW = Phaser.Math.Between(50, 90);
        // Trunk
        graphics.fillStyle(0x3f2e18, 0.7);
        graphics.fillRect(tx + treeW / 2 - 5, 650 - treeH / 3, 10, treeH / 3);
        // Foliage crown
        graphics.fillStyle(Phaser.Math.RND.pick([0x047857, 0x065f46, 0x0f766e]), 0.65);
        graphics.fillCircle(tx + treeW / 2, 650 - treeH * 0.7, treeW / 2);
        graphics.fillCircle(tx + treeW / 2 - 12, 650 - treeH * 0.55, treeW / 2.4);
        graphics.fillCircle(tx + treeW / 2 + 12, 650 - treeH * 0.55, treeW / 2.4);

        // Warm park decorative lanterns along embankment
        if (Math.random() > 0.4) {
          graphics.fillStyle(0xfef08a, 0.8);
          graphics.fillCircle(tx + treeW + 20, 650 - 90, 6);
          graphics.fillStyle(0x334155, 0.85);
          graphics.fillRect(tx + treeW + 18, 650 - 85, 4, 85);
        }

        tx += treeW + Phaser.Math.Between(60, 160);
      }
      return;
    }

    // B. ROOFTOPS SKYLINE (Level 2, 9)
    if (levelId === 2 || levelId === 9) {
      // High-altitude perspective: roofs, antenna masts, satellite dishes, AC chillers, red aircraft beacons
      let rx = 0;
      while (rx < width) {
        const rWidth = Phaser.Math.Between(120, 240);
        const rHeight = Phaser.Math.Between(340, 560);
        const roofColor = Phaser.Math.RND.pick([0x18181b, 0x09090b, 0x27272a, 0x1e1b4b]);
        graphics.fillStyle(roofColor, 0.75);
        graphics.fillRect(rx, 650 - rHeight, rWidth, rHeight);

        // High-rise illuminated office windows
        graphics.fillStyle(0x38bdf8, 0.4);
        for (let wx = rx + 14; wx < rx + rWidth - 14; wx += 22) {
          for (let wy = 670 - rHeight; wy < 630; wy += 32) {
            if (Math.random() > 0.4) {
              graphics.fillRect(wx, wy, 10, 14);
            }
          }
        }

        // Tall antenna masts with blinking red obstacle lights on rooftops
        const mastX = rx + rWidth / 2;
        graphics.lineStyle(2, 0x94a3b8, 1);
        graphics.beginPath();
        graphics.moveTo(mastX, 650 - rHeight);
        graphics.lineTo(mastX, 650 - rHeight - 60);
        graphics.stroke();

        // Red aircraft beacon
        graphics.fillStyle(0xef4444, 0.95);
        graphics.fillCircle(mastX, 650 - rHeight - 62, 4);

        // Water tower / AC chiller silhouetted on roof edge
        graphics.fillStyle(0x334155, 0.8);
        graphics.fillRect(rx + 12, 650 - rHeight - 24, 30, 24);

        rx += rWidth + Phaser.Math.Between(10, 35);
      }
      return;
    }

    // C. METRO TUNNEL (Level 10)
    if (levelId === 10) {
      // Underground concrete tunnel arches, conduit pipes, emergency yellow incandescent fixtures
      graphics.fillStyle(0x0c0a09, 0.9);
      graphics.fillRect(0, 0, width, 650);

      // Tunnel ribbed vaulted rings
      for (let tx = 0; tx < width; tx += 90) {
        graphics.lineStyle(14, 0x292524, 1);
        graphics.strokeRect(tx, 0, 80, 650);

        // Tunnel cabling conduits along upper wall
        graphics.fillStyle(0x44403c, 0.8);
        graphics.fillRect(tx, 220, 90, 6);
        graphics.fillRect(tx, 232, 90, 4);

        // Amber hazard bunker lamps with glow
        graphics.fillStyle(0xf59e0b, 0.9);
        graphics.fillCircle(tx + 40, 260, 7);
        graphics.fillStyle(0xfde047, 0.25);
        graphics.fillCircle(tx + 40, 260, 24);
      }
      return;
    }

    // D. HIGHWAY & FREEWAY BRIDGES (Level 5, 8, 12, 14)
    if (levelId === 5 || levelId === 8 || levelId === 12 || levelId === 14) {
      // Overhead concrete viaducts, suspension pylons, road sign gantries
      let hx = 0;
      while (hx < width) {
        const bWidth = Phaser.Math.Between(100, 200);
        const bHeight = Phaser.Math.Between(260, 440);
        graphics.fillStyle(0x1c1917, 0.6);
        graphics.fillRect(hx, 650 - bHeight, bWidth, bHeight);

        // Overhead highway overpass bridge spanning in background
        if (hx % 400 < 120) {
          graphics.fillStyle(0x334155, 0.7);
          graphics.fillRect(hx - 80, 340, 360, 28);
          // Massive concrete pillar support
          graphics.fillRect(hx + 80, 340, 36, 310);
        }

        hx += bWidth + Phaser.Math.Between(20, 60);
      }
      return;
    }

    // E. STORM BRIDGE & NIGHT (Level 6, 11)
    if (theme === 'storm' || levelId === 6 || levelId === 11) {
      // Massive suspension bridge cables and lightning-silhouette towers
      let sx = 0;
      while (sx < width) {
        // Gigantic suspension bridge concrete pylons
        if (sx % 650 < 100) {
          graphics.fillStyle(0x0f172a, 0.9);
          // Left & right pylon columns
          graphics.fillRect(sx, 80, 28, 570);
          graphics.fillRect(sx + 100, 80, 28, 570);
          // Cross-beams
          graphics.fillRect(sx, 220, 128, 22);
          graphics.fillRect(sx, 380, 128, 22);
          // Suspension cable diagonals
          graphics.lineStyle(3, 0x38bdf8, 1);
          graphics.beginPath();
          graphics.moveTo(sx + 14, 80);
          graphics.lineTo(sx - 260, 520);
          graphics.moveTo(sx + 114, 80);
          graphics.lineTo(sx + 380, 520);
          graphics.stroke();
        }

        // Dark monolithic stormy skyscrapers
        const sWidth = Phaser.Math.Between(80, 150);
        const sHeight = Phaser.Math.Between(280, 500);
        graphics.fillStyle(0x0b1120, 0.65);
        graphics.fillRect(sx, 650 - sHeight, sWidth, sHeight);

        // Windows illuminated by storm flashes
        graphics.fillStyle(0x93c5fd, 0.4);
        for (let wx = sx + 8; wx < sx + sWidth - 8; wx += 16) {
          for (let wy = 670 - sHeight; wy < 630; wy += 28) {
            if (Math.random() > 0.6) {
              graphics.fillRect(wx, wy, 8, 12);
            }
          }
        }

        sx += sWidth + Phaser.Math.Between(20, 50);
      }
      return;
    }

    // F. INDUSTRIAL ZONE & FACTORIES (Level 3, 7)
    if (theme === 'industrial' || levelId === 3 || levelId === 7) {
      let ix = 0;
      while (ix < width) {
        const facWidth = Phaser.Math.Between(130, 260);
        const facHeight = Phaser.Math.Between(220, 420);
        // Factory shed silhouette
        graphics.fillStyle(0x18181b, 0.7);
        graphics.fillRect(ix, 650 - facHeight, facWidth, facHeight);

        // Smokestacks with warning stripes
        const stackX = ix + 25;
        const stackH = facHeight + Phaser.Math.Between(50, 110);
        graphics.fillStyle(0x27272a, 0.85);
        graphics.fillRect(stackX, 650 - stackH, 20, stackH);
        graphics.fillStyle(0xef4444, 0.85);
        graphics.fillRect(stackX, 650 - stackH, 20, 14);
        graphics.fillStyle(0xf8fafc, 0.85);
        graphics.fillRect(stackX, 650 - stackH + 14, 20, 14);

        // Orange furnace glow in windows
        graphics.fillStyle(0xf97316, 0.55);
        for (let wx = ix + 16; wx < ix + facWidth - 16; wx += 24) {
          for (let wy = 670 - facHeight; wy < 630; wy += 36) {
            if (Math.random() > 0.35) {
              graphics.fillRect(wx, wy, 12, 16);
            }
          }
        }

        ix += facWidth + Phaser.Math.Between(20, 60);
      }
      return;
    }

    // G. CYBER MATRIX CITY & NIGHT NEON (Level 13 & Default)
    let cx = 0;
    while (cx < width) {
      const bWidth = Phaser.Math.Between(80, 180);
      const bHeight = Phaser.Math.Between(300, 560);
      const color = Phaser.Math.RND.pick([0x030712, 0x0f172a, 0x1e1b4b]);
      graphics.fillStyle(color, 0.75);
      graphics.fillRect(cx, 650 - bHeight, bWidth, bHeight);

      // Neon billboards and cyan/magenta windows
      const neonColor = Phaser.Math.RND.pick([0x06b6d4, 0xf43f5e, 0xa855f7, 0x10b981]);
      graphics.fillStyle(neonColor, 0.6);
      for (let wx = cx + 10; wx < cx + bWidth - 10; wx += 18) {
        for (let wy = 670 - bHeight; wy < 630; wy += 28) {
          if (Math.random() > 0.4) {
            graphics.fillRect(wx, wy, 8, 12);
          }
        }
      }

      // Neon billboard banner on random building top
      if (Math.random() > 0.45) {
        graphics.fillStyle(neonColor, 0.85);
        graphics.fillRect(cx + 8, 650 - bHeight - 18, bWidth - 16, 14);
      }

      cx += bWidth + Phaser.Math.Between(15, 45);
    }
  }

  private buildLevel(worldWidth: number) {
    const theme = this.levelConfig.theme;
    const levelId = this.levelConfig.id;

    // Theme-based ground and exterior terrain selection matching level name
    let tileKey = 'tile_road';
    if (levelId === 1 || levelId === 4 || levelId === 15) {
      tileKey = 'tile_embankment_park';
    } else if (levelId === 2 || levelId === 9) {
      tileKey = 'tile_rooftop';
    } else if (levelId === 10) {
      tileKey = 'tile_metro';
    } else if (levelId === 5 || levelId === 8 || levelId === 12 || levelId === 14) {
      tileKey = 'tile_highway_asphalt';
    } else if (theme === 'industrial' || theme === 'cyber' || levelId === 3 || levelId === 7) {
      tileKey = 'tile_industrial';
    }

    const groundY = 650;

    // 1. SOLID CONTINUOUS GROUND ACROSS ENTIRE WORLD (NO GAPS OR HOLES)
    for (let px = -120; px < worldWidth + 400; px += 120) {
      const p = this.platforms.create(px + 60, groundY + 40, tileKey);
      p.refreshBody();
    }

    // 2. FOUNDATION GRAPHICS UNDERNEATH ROAD (NO DARK ABYSS)
    const roadBed = this.add.graphics();
    const bedColor = levelId === 10 ? 0x0c0a09 : (levelId === 1 || levelId === 4 ? 0x064e3b : 0x0f172a);
    roadBed.fillStyle(bedColor, 1);
    roadBed.fillRect(-200, groundY + 80, worldWidth + 800, 120);
    roadBed.setDepth(1);

    // 3. POPULATE THE STREET WITH OBSTACLES, RAMPS, AND ELEVATED TRACKS
    let segX = 520;
    while (segX < worldWidth - 650) {
      const segLen = Phaser.Math.Between(500, 850);
      this.populateSegment(segX, segX + segLen, groundY, tileKey);
      segX += segLen + Phaser.Math.Between(80, 160);
    }

    // 4. FINAL STRETCH & FINISH (VOLTARZ MEETUP)
    const finishStartX = worldWidth - 550;

    // Super Launch Ramp before finish!
    const superRamp = this.ramps.create(finishStartX + 120, groundY - 26, 'kicker_ramp');
    superRamp.setScale(1.4);
    superRamp.refreshBody();

    // Finish Arch «VOLTARZ»
    this.finishArch = this.add.image(worldWidth - 180, groundY - 110, 'arch_voltarz');
    this.finishArch.setDepth(5);

    // Finish sensor zone with explicit static body bounds
    this.finishZone = this.add.zone(worldWidth - 140, groundY - 70, 80, 240);
    this.physics.add.existing(this.finishZone, true);
    if (this.finishZone.body) {
      const fBody = this.finishZone.body as Phaser.Physics.Arcade.StaticBody;
      fBody.setSize(80, 240);
      fBody.reset(worldWidth - 140, groundY - 70);
    }

    // Crowd of fellow EUC riders celebrating at finish
    for (let i = 0; i < 4; i++) {
      const friendSema = this.add.image(worldWidth - 260 + i * 50, groundY - 60, 'sema_normal');
      friendSema.setScale(0.72);
      friendSema.setFlipX(true);
      friendSema.setDepth(4);
    }
  }

  private populateSegment(startX: number, endX: number, groundY: number, groundTileKey: string) {
    // Checkpoint every ~700-900m
    if (startX > 400 && startX - this.lastCheckpointX > 750 && startX < this.levelConfig.length - 800) {
      const cp = this.checkpoints.create(startX + 80, groundY - 58, 'checkpoint_inactive');
      cp.refreshBody();
    }

    // High-tech Electric Charging Station (Электрозаправка) placed along track
    if (startX > 480 && startX - this.lastChargingStationX > 950 && startX < this.levelConfig.length - 650) {
      this.lastChargingStationX = startX + 220;
      const cs = this.chargingStations.create(startX + 220, groundY - 60, 'station_charger');
      cs.refreshBody();
    }

    const lvlProg = Math.min(1, (this.levelConfig.id - 1) / 14); // 0.0 on lvl 1 to 1.0 on lvl 15
    const density = this.levelConfig.obstacleDensity || 1.0;
    const elevatedChance = Math.min(0.75, 0.38 + lvlProg * 0.35);

    // Elevated platforms / bridges (generous overhead clearance, 100% passable underneath!)
    if (Math.random() < elevatedChance && endX - startX > 380) {
      const platY = groundY - Phaser.Math.Between(230, 270);
      const platLen = Phaser.Math.Between(220, 420);
      const platX = startX + 130;

      for (let px = platX; px < platX + platLen; px += 120) {
        const ep = this.elevatedPlatforms.create(px + 60, platY, groundTileKey);
        const epBody = ep.body as Phaser.Physics.Arcade.StaticBody;
        epBody.checkCollision.down = false;
        epBody.checkCollision.left = false;
        epBody.checkCollision.right = false;
        epBody.checkCollision.up = true;
        ep.refreshBody();
      }

      // Kicker ramp to reach elevated platform
      const ramp = this.ramps.create(platX - 90, groundY - 26, 'kicker_ramp');
      ramp.refreshBody();

      // VOLTs on elevated platform
      for (let vx = platX + 40; vx < platX + platLen - 20; vx += 55) {
        this.voltTokens.create(vx, platY - 45, 'token_volt');
      }
    }

    // Collectibles & Obstacles along ground with density scaling
    let currentX = startX + 80;
    const stepScale = Math.max(0.48, 1.1 / density);

    // 🌟 FLYING DRONES WITH POOP ATTACK 🌟
    // Drones patrol overhead and drop poop when Sema rides beneath them
    const droneCount = Phaser.Math.Between(1, 2);
    for (let d = 0; d < droneCount; d++) {
      const droneX = startX + 160 + d * Math.round((endX - startX - 260) / Math.max(1, droneCount)) + Phaser.Math.Between(-30, 30);
      const droneY = groundY - Phaser.Math.Between(210, 260); // In the air overhead (Y ≈ 390 - 440)
      const drone = this.drones.create(droneX, droneY, 'drone_quadcopter') as Phaser.Physics.Arcade.Sprite;
      drone.setDepth(12);
      if (drone.body) {
        const db = drone.body as Phaser.Physics.Arcade.Body;
        db.setAllowGravity(false);
        db.setImmovable(true);
        db.setSize(52, 28);
        db.setOffset(16, 12);
      }
      drone.setVelocityX(Phaser.Math.RND.pick([-45, 45]));
      drone.setData('startY', droneY);
      drone.setData('minX', droneX - 85);
      drone.setData('maxX', droneX + 85);
      drone.setData('dropCooldown', Phaser.Math.Between(2200, 3600));
      drone.setData('lastDrop', 0);
    }

    // Probabilities evolve as level increases:
    const enemyThreshold = 1.0 - (0.12 + lvlProg * 0.22); // e.g. 0.88 down to 0.66
    const puddleThreshold = enemyThreshold - (0.14 + lvlProg * 0.08);
    const obstacleThreshold = puddleThreshold - (0.20 + lvlProg * 0.16);

    // Obstacle types selected based on level theme and exterior
    const levelId = this.levelConfig.id;
    let availableObstacles = ['obstacle_cone', 'obstacle_bench', 'obstacle_scooter_fallen'];

    if (levelId === 1 || levelId === 4 || levelId === 15) {
      // Park & Embankment
      availableObstacles = ['obstacle_bench', 'obstacle_storm_grate', 'obstacle_cone'];
    } else if (levelId === 2 || levelId === 9) {
      // Rooftops
      availableObstacles = ['obstacle_rooftop_vent', 'obstacle_bench', 'obstacle_cone'];
    } else if (levelId === 3 || levelId === 7) {
      // Industrial
      availableObstacles = ['obstacle_industrial_barrel', 'obstacle_jersey_barrier', 'obstacle_storm_grate'];
    } else if (levelId === 10) {
      // Metro
      availableObstacles = ['obstacle_metro_hazard', 'obstacle_storm_grate', 'obstacle_cone'];
    } else if (levelId === 5 || levelId === 8 || levelId === 12 || levelId === 14) {
      // Highways
      availableObstacles = ['obstacle_jersey_barrier', 'obstacle_cone', 'obstacle_scooter_fallen'];
    }

    while (currentX < endX - 90) {
      const rand = Math.random();

      if (rand < obstacleThreshold * 0.45) {
        // Line of VOLT tokens (2-3 tokens)
        const count = Phaser.Math.Between(2, 3);
        for (let i = 0; i < count; i++) {
          this.voltTokens.create(currentX + i * 42, groundY - 50, 'token_volt');
        }
        currentX += Math.round(140 * stepScale);
      } else if (rand < obstacleThreshold * 0.75) {
        // Battery pickup
        this.batteries.create(currentX, groundY - 45, 'item_battery');
        currentX += Math.round(120 * stepScale);
      } else if (rand < obstacleThreshold) {
        // Super Lightning bonus
        this.lightningPickups.create(currentX, groundY - 50, 'item_super_lightning');
        currentX += Math.round(135 * stepScale);
      } else if (rand < puddleThreshold) {
        // Obstacle matching level theme & exterior
        const obsType = Phaser.Math.RND.pick(availableObstacles);
        const obs = this.obstacles.create(currentX, groundY - 16, obsType);
        const obsBody = obs.body as Phaser.Physics.Arcade.StaticBody;
        if (obsType === 'obstacle_cone') {
          obsBody.setSize(24, 28);
          obsBody.setOffset(10, 24);
        } else if (obsType === 'obstacle_bench') {
          obsBody.setSize(68, 26);
          obsBody.setOffset(16, 32);
        } else if (obsType === 'obstacle_scooter_fallen') {
          obsBody.setSize(58, 18);
          obsBody.setOffset(14, 24);
        } else if (obsType === 'obstacle_storm_grate') {
          obsBody.setSize(48, 14);
          obsBody.setOffset(8, 28);
        } else if (obsType === 'obstacle_industrial_barrel') {
          obsBody.setSize(34, 46);
          obsBody.setOffset(7, 10);
        } else if (obsType === 'obstacle_rooftop_vent') {
          obsBody.setSize(46, 36);
          obsBody.setOffset(9, 18);
        } else if (obsType === 'obstacle_metro_hazard') {
          obsBody.setSize(38, 48);
          obsBody.setOffset(5, 8);
        } else if (obsType === 'obstacle_jersey_barrier') {
          obsBody.setSize(64, 30);
          obsBody.setOffset(8, 26);
        }
        obs.refreshBody();
        currentX += Math.round(125 * stepScale);
      } else if (rand < enemyThreshold) {
        // Puddle
        const puddle = this.puddles.create(currentX, groundY - 6, 'obstacle_puddle');
        puddle.refreshBody();
        currentX += Math.round(115 * stepScale);
      } else {
        // Moving enemy: ЖЁЛТОЕ ТАКСИ, САМОКАТЧИК or ЗАЦЕПЕР with level-scaled velocity
        const enemyRoll = Math.random();
        const isTaxi = enemyRoll < 0.38;
        const isScooter = !isTaxi && enemyRoll < 0.72;
        let enemyKey = 'enemy_zaceper';
        let enemyY = groundY - 47;

        if (isTaxi) {
          enemyKey = 'enemy_yellow_taxi';
          enemyY = groundY - 44; // Car wheels touch road asphalt perfectly
        } else if (isScooter) {
          enemyKey = 'enemy_scooter_rider';
          enemyY = groundY - 49;
        }

        const enemy = this.enemies.create(currentX + 90, enemyY, enemyKey) as Phaser.Physics.Arcade.Sprite;
        enemy.setCollideWorldBounds(true);
        if (enemy.body) {
          const eBody = enemy.body as Phaser.Physics.Arcade.Body;
          eBody.setAllowGravity(false);
          eBody.setImmovable(true);
          if (isTaxi) {
            eBody.setSize(140, 50);
            eBody.setOffset(18, 32);
            enemy.setData('isTaxi', true);
          } else if (isScooter) {
            eBody.setSize(56, 88);
            eBody.setOffset(12, 10);
          } else {
            eBody.setSize(44, 88);
            eBody.setOffset(15, 8);
          }
        }
        const baseEnemySpeed = this.levelConfig.enemySpeed || -120;
        const finalEnemyVel = isTaxi
          ? Math.round(baseEnemySpeed * 1.32)
          : (isScooter ? baseEnemySpeed : Math.round(baseEnemySpeed * 1.2));
        enemy.setVelocityX(finalEnemyVel);
        enemy.setBounce(1);
        enemy.setData('minX', currentX - 80);
        enemy.setData('maxX', currentX + (isTaxi ? 380 : 260));
        enemy.setData('lockedY', enemyY);
        currentX += Math.round((isTaxi ? 290 : 230) * stepScale);
      }
    }
  }

  public update(time: number, delta: number) {
    if (this.isGameOver || this.isVictory) {
      soundManager.stopMotor();
      return;
    }

    // 0. FLOOR CLAMP SAFEGUARD (Sema can NEVER fall through or sink into the road)
    if (this.player.y > 610) {
      this.player.setY(565);
      if (this.player.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      }
    }

    this.elapsedTime += delta / 1000;

    // 1. UPDATE DISTANCE & PROGRESS
    const currentDist = Math.max(0, Math.floor(this.player.x / 10));
    if (currentDist > this.distance) {
      this.distance = currentDist;
    }

    // Check finish arch crossing (when within 220px of the finish arch)
    if (!this.isVictory && !this.isGameOver && this.player.x >= this.levelConfig.length - 220) {
      this.handleFinish();
      return;
    }

    // 2. DAY-NIGHT PROGRESSION
    this.updateAtmosphere();

    // 3. ENEMY PATROLS (Lock Y directly to asphalt road surface so scooter riders NEVER fall under ground)
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      const minX = e.getData('minX') || 0;
      const maxX = e.getData('maxX') || 999999;
      const lockedY = e.getData('lockedY') || 601;
      e.setY(lockedY);
      if (e.body) {
        const eb = e.body as Phaser.Physics.Arcade.Body;
        eb.setVelocityY(0);
        eb.setAllowGravity(false);
      }
      if (e.x <= minX) {
        e.setVelocityX(Math.abs(e.body?.velocity.x || 120));
        e.setFlipX(true);
      } else if (e.x >= maxX) {
        e.setVelocityX(-Math.abs(e.body?.velocity.x || 120));
        e.setFlipX(false);
      }

      // Yellow Taxi shouting & honking logic («ЭЙ, ДАВАЙ ДО СВИДАНИЯ!»)
      if (e.texture?.key.includes('taxi')) {
        const distToPlayer = Math.abs(this.player.x - e.x);
        const lastShout = e.getData('lastShout') || 0;
        if (distToPlayer < 420 && (time - lastShout) > 3800 && !this.isGameOver && !this.isVictory) {
          e.setData('lastShout', time);
          // 1. Dual-tone taxi horn
          soundManager.playTaxiHonk();
          // 2. Yelling voice with funny cartoon Georgian accent
          soundManager.speakTaxiVoice(RU.taxiPhoneShout);
          // 3. Texture switches to wide-open shouting mouth & waving hand
          e.setTexture('enemy_yellow_taxi_yell');
          this.time.delayedCall(1600, () => {
            if (e && e.active) {
              e.setTexture('enemy_yellow_taxi');
            }
          });
          // 4. Comic speech balloon right above the taxi driver
          const bubbleX = e.flipX ? e.x + 25 : e.x - 25;
          this.createSpeechBubble(bubbleX, e.y - 62, `«${RU.taxiShout}»`);
        }
      }
    });

    // 3.1 DRONES & POOP DROP LOGIC
    (this.drones.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((drone) => {
      if (!drone.active) return;
      const startY = drone.getData('startY') || 390;
      const minX = drone.getData('minX') || (drone.x - 70);
      const maxX = drone.getData('maxX') || (drone.x + 70);
      const dropCooldown = drone.getData('dropCooldown') || 2800;
      const lastDrop = drone.getData('lastDrop') || 0;

      // Hover bobbing with sine wave
      drone.setY(startY + Math.sin(time / 260 + drone.x * 0.05) * 8);

      // Patrol movement
      if (drone.body) {
        const db = drone.body as Phaser.Physics.Arcade.Body;
        db.setVelocityY(0);
        db.setAllowGravity(false);
        if (drone.x <= minX) {
          drone.setVelocityX(Math.abs(drone.body.velocity.x || 45));
          drone.setFlipX(true);
        } else if (drone.x >= maxX) {
          drone.setVelocityX(-Math.abs(drone.body.velocity.x || 45));
          drone.setFlipX(false);
        }
      }

      // Check if player is beneath or approaching the drone
      const dxToPlayer = this.player.x - drone.x;
      const inDropZone = dxToPlayer >= -160 && dxToPlayer <= 50;
      const playerBeneath = this.player.y > drone.y + 40;

      if (inDropZone && playerBeneath && (time - lastDrop) > dropCooldown && !this.isGameOver && !this.isVictory) {
        drone.setData('lastDrop', time);
        // Drone drops poop projectile!
        const poop = this.poopProjectiles.create(drone.x, drone.y + 20, 'poop_projectile') as Phaser.Physics.Arcade.Sprite;
        poop.setDepth(11);
        if (poop.body) {
          const pb = poop.body as Phaser.Physics.Arcade.Body;
          pb.setAllowGravity(true);
          pb.setGravityY(750);
          pb.setVelocityX(drone.body ? drone.body.velocity.x * 0.35 : 0);
          pb.setVelocityY(80);
          pb.setSize(18, 18);
          pb.setOffset(6, 6);
        }
        poop.setData('sourceDrone', drone);

        // Sound & speech bubble
        soundManager.playPoopDropSound();
        this.createSpeechBubble(drone.x, drone.y - 48, `«${RU.droneGnomeDrop || 'ХИ-ХИ! СМОТРИ НАВЕРХ!'}»`);

        // Visual squash & stretch drop tween
        this.tweens.add({
          targets: drone,
          scaleY: 0.8,
          scaleX: 1.2,
          yoyo: true,
          duration: 120,
        });
      }
    });

    // Check poop falling and ground splat
    (this.poopProjectiles.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((poop) => {
      if (!poop.active) return;
      poop.rotation += 0.08;
      // When poop hits ground level
      if (poop.y >= 578) {
        this.createPoopSplat(poop.x, 578);
        soundManager.playPoopSplatSound();
        poop.destroy();
      }
    });

    // 4. SUPER BOOST TIMER
    if (this.isSuperBoost) {
      this.superBoostTimer -= delta / 1000;
      if (this.superBoostTimer <= 0) {
        this.isSuperBoost = false;
        this.triggerSpeech('БУСТ ЗАВЕРШИЛСЯ');
      }
    }

    // 5. BATTERY DISCHARGE & TILTBACK LOGIC
    // EUC naturally discharges over time while riding; pickups & charging stations recharge it!
    const isMoving = Math.abs(this.player.body?.velocity.x || 0) > 20;
    const drainRate = this.isBoosting ? 14.0 : (isMoving ? 2.4 : 0.2);

    if (!this.isSuperBoost) {
      this.battery = Math.max(0, this.battery - (delta / 1000) * drainRate);
    }

    // TILTBACK (Подъем педалей при разряде) trigger & alarms:
    if (this.battery <= 25) {
      if (!this.isTiltback) {
        this.isTiltback = true;
        this.isBoosting = false;
        this.tiltbackBeepTimer = 0;
        this.tiltbackSpeechTimer = 0;
        this.triggerSpeech('ПЕДАЛИ ЗАДРАЛО! ИЩИ ЗАПРАВКУ!');
        this.createFloatingText(this.player.x, this.player.y - 50, '⚠ TILTBACK! ЗАДИР ПЕДАЛЕЙ!', '#f43f5e');
      }

      // Authentic EUC tiltback beeper
      this.tiltbackBeepTimer -= delta / 1000;
      if (this.tiltbackBeepTimer <= 0) {
        soundManager.playTiltbackAlarm();
        this.tiltbackBeepTimer = 1.7;
      }

      // Voice warning intervals
      this.tiltbackSpeechTimer -= delta / 1000;
      if (this.tiltbackSpeechTimer <= 0) {
        if (this.battery <= 8) {
          this.triggerSpeech('ЕЛЕ ЕДУ! СЕЙЧАС ВЫРУБИТСЯ!');
        } else {
          this.triggerSpeech('ПЕДАЛИ ЗАДРАЛО! СРОЧНО ЗАРЯДКУ!');
        }
        this.tiltbackSpeechTimer = 4.2;
      }
    } else if (this.isTiltback && this.battery > 25) {
      this.isTiltback = false;
      this.player.setAngle(0);
      this.triggerSpeech('ЗАРЯДИЛСЯ! ПЕДАЛИ В НОРМЕ!');
      this.createFloatingText(this.player.x, this.player.y - 45, '⚡ ПЕДАЛИ В НОРМЕ ⚡', '#10b981');
    }

    // 6. SPEED WOBBLE («ВОБЛА!») LOGIC
    if (this.distance > this.nextWobbleDistance && !this.isWobbling && !this.isAirborne) {
      this.triggerWobble();
    }

    if (this.isWobbling) {
      this.wobbleTimer -= delta / 1000;
      // Oscillate rotation and shake camera
      const wobbleAngle = Math.sin(time * 0.04) * 16;
      this.player.setAngle(wobbleAngle);
      if (this.wobbleTimer <= 0) {
        this.isWobbling = false;
        this.triggerSpeech('СЁМА, ДЕРЖИ!');
        this.player.setAngle(0);
      }
    }

    // 7. SÉMA EUC MOVEMENT & CONTROLS
    this.handleMovement(delta);

    // 8. SPEEDOMETER, PWM, OVERSPEED (> 115 km/h) & CUTOUT (>= 150 km/h)
    const playerVelX = this.player.body ? Math.abs((this.player.body as Phaser.Physics.Arcade.Body).velocity.x) : 0;
    // Speed conversion: 6.8 px/s ~ 1 km/h
    this.speedKmh = Math.round((playerVelX / 6.8) * 10) / 10;

    // Track max and average speed
    if (this.speedKmh > this.maxSpeedKmh) {
      this.maxSpeedKmh = this.speedKmh;
    }
    if (this.speedKmh > 2) {
      this.speedSamplesSum += this.speedKmh;
      this.speedSamplesCount += 1;
      this.avgSpeedKmh = Math.round((this.speedSamplesSum / this.speedSamplesCount) * 10) / 10;
    }

    // PWM (ШИМ) calculation: EUC motor duty cycle calibrated to 150 km/h max speed
    const basePwm = (this.speedKmh / 150) * 80;
    // Boost pushes PWM higher; continuous hold drives PWM towards 100%
    const boostPwmSurge = this.isBoosting ? 8 + (this.boostHoldDuration / 3.0) * 18 : 0;
    this.currentPwm = Math.min(100, Math.max(0, Math.round(basePwm + boostPwmSurge)));
    if (this.currentPwm > this.maxPwm) {
      this.maxPwm = this.currentPwm;
    }

    // Cutout / Продав колеса при превышении 150 км/ч
    if (this.speedKmh >= 150.0 && !this.isCutout && !this.isGameOver && !this.isVictory) {
      this.triggerCutout('speed');
    }

    const wasOverspeed = this.isOverspeed;
    this.isOverspeed = this.speedKmh > 115.0;

    if (this.isOverspeed) {
      this.overspeedBeepTimer -= delta / 1000;
      if (!wasOverspeed) {
        soundManager.playSpeedAlert();
        this.triggerSpeech(RU.semaSlowDownSpeech); // «Сёма, не гони!»
        this.overspeedBeepTimer = 1.2;
      } else if (this.overspeedBeepTimer <= 0) {
        soundManager.playSpeedAlert();
        this.overspeedBeepTimer = 1.2; // Repeat warning beep every 1.2s while overspeeding
      }
    } else {
      this.overspeedBeepTimer = 0;
    }

    // 9. AIR & TRICK ROTATION LOGIC
    const onGround = this.player.body?.blocked.down || this.player.body?.touching.down;
    if (!onGround) {
      if (!this.isAirborne) {
        // Just took off
        this.isAirborne = true;
        this.airStartTime = time;
        this.airStartX = this.player.x;
        this.airStartY = this.player.y;
        this.airRotationTotal = 0;
        this.lastAngle = this.player.angle;
      } else {
        // While airborne, pressing left or right spins Sema for tricks!
        if (this.inputState.left) {
          this.player.setAngle(this.player.angle - 6);
        } else if (this.inputState.right) {
          this.player.setAngle(this.player.angle + 6);
        }

        // Track rotation delta
        const currentAngle = this.player.angle;
        this.airRotationTotal += Math.abs(currentAngle - this.lastAngle);
        this.lastAngle = currentAngle;

        // Camera zoom out during high air jumps
        const jumpHeight = Math.max(0, this.airStartY - this.player.y);
        if (jumpHeight > 100) {
          const targetZoom = Math.max(0.82, 1.0 - (jumpHeight / 600) * 0.22);
          this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.08));
        }
      }
    } else {
      // On ground: smooth zoom restore
      if (this.cameras.main.zoom < 1.0) {
        this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, 1.0, 0.1));
      }
    }

    // 9. UPDATE LIGHTS & PARTICLES POSITION
    this.updateLightsAndEffects();

    // 10. SPEECH TIMER
    if (this.speechTimer > 0) {
      this.speechTimer -= delta / 1000;
      if (this.speechTimer <= 0) {
        this.activeSpeechString = null;
        this.trickPopupString = null;
      }
    }

    // 11. EMIT STATS UPDATE TO REACT HUD
    this.emitStats();
  }

  private emitStats() {
    this.onStatsUpdate({
      shields: this.shields,
      maxShields: this.maxShields,
      battery: Math.round(this.battery),
      score: this.score,
      voltsCollected: this.voltsCollected,
      distance: this.distance,
      tricksCount: this.tricksCount,
      fallsCount: this.fallsCount,
      elapsedTime: Math.floor(this.elapsedTime),
      combo: this.combo,
      speedKmh: this.speedKmh,
      maxSpeedKmh: this.maxSpeedKmh,
      avgSpeedKmh: this.avgSpeedKmh,
      pwm: this.currentPwm,
      maxPwm: this.maxPwm,
      isCutout: this.isCutout,
      cutoutReason: this.cutoutReason,
      isOverspeed: this.isOverspeed,
      isBoosting: this.isBoosting,
      boostHoldDuration: Math.round(this.boostHoldDuration * 10) / 10,
      isSuperBoost: this.isSuperBoost,
      isWobbling: this.isWobbling,
      isTiltback: this.isTiltback,
      activeSpeech: this.activeSpeechString,
      trickPopup: this.trickPopupString,
      currentLevel: this.levelConfig.id,
      levelName: this.levelConfig.name,
      levelLength: this.levelConfig.length,
    });
  }

  private handleMovement(delta: number) {
    const onGround = this.player.body?.blocked.down || this.player.body?.touching.down;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Determine speed bounds based on level configuration:
    // Progressive speed from Level 1 (~44 km/h) up to Level 15 (~85 km/h cruising, ~146 km/h boost, ~150 km/h top limit)
    let maxSpeed: number;
    let accel: number;

    if (this.isTiltback && !this.isSuperBoost) {
      // Pedal lift / Tiltback: EUC protects itself and forces speed throttling ("еле едет")
      if (this.battery <= 5) {
        maxSpeed = 48; // ~7 km/h (barely rolling)
      } else if (this.battery <= 15) {
        maxSpeed = 82; // ~12 km/h (slow limp)
      } else {
        maxSpeed = 125; // ~18 km/h (reduced speed)
      }
      accel = onGround ? 220 : 130;
    } else {
      const baseSpeed = this.levelConfig.baseSpeed || 300;
      const normalBoost = this.levelConfig.boostSpeed || 680;
      const boostSpeed = this.isSuperBoost ? Math.min(1020, normalBoost + 50) : normalBoost;
      maxSpeed = this.isBoosting ? boostSpeed : baseSpeed;
      accel = onGround ? Math.round(880 + this.levelConfig.id * 20) : Math.round(460 + this.levelConfig.id * 12);
    }

    const drag = onGround ? Math.round(780 + this.levelConfig.id * 10) : 250;
    body.setDragX(drag);

    // Boost activation with 3-second cutout limit
    if (this.inputState.boost && (this.battery > 0 || this.isSuperBoost)) {
      if (this.isTiltback && !this.isSuperBoost) {
        this.isBoosting = false;
        this.boostHoldDuration = 0;
        // Boost disabled while pedals are lifted
      } else {
        if (!this.isBoosting) {
          this.isBoosting = true;
          soundManager.playBoost();
          this.triggerSpeech(RU.phrases[1]); // «ПОШЁЛ БУСТ!»
        }

        // Accumulate continuous boost hold duration
        this.boostHoldDuration += delta / 1000;

        // Warning sound & alert when approaching 3.0 seconds
        if (this.boostHoldDuration >= 1.5 && this.boostHoldDuration < 3.0) {
          this.boostWarningTimer -= delta / 1000;
          if (this.boostWarningTimer <= 0) {
            soundManager.playBoostWarning(this.boostHoldDuration);
            if (this.boostHoldDuration >= 2.2) {
              this.triggerSpeech('ПЕРЕГРЕВ! ОТПУСТИ БУСТ!');
              this.cameras.main.shake(70, 0.005);
            }
            // Warning beep frequency accelerates as 3.0s approaches
            this.boostWarningTimer = Math.max(0.12, 0.42 - (this.boostHoldDuration - 1.5) * 0.2);
          }
        }

        // CRITICAL CUTOUT: Boost held for more than 3 seconds!
        if (this.boostHoldDuration >= 3.0 && !this.isCutout && !this.isGameOver && !this.isVictory) {
          this.triggerCutout('boost');
        }
      }
    } else {
      this.isBoosting = false;
      this.boostHoldDuration = Math.max(0, this.boostHoldDuration - (delta / 1000) * 3.5);
      this.boostWarningTimer = 0;
    }

    // Down button: Crouch / duck low when on ground (reduces height so player fits ANYWHERE), or fast dive in air
    const wantsCrouch = this.inputState.down && onGround;
    if (wantsCrouch) {
      if (!this.isCrouching) {
        this.isCrouching = true;
        // Duck low hitbox (reduces height down to 65px)
        this.player.setSize(48, 65);
        this.player.setOffset(61, 160);
      }
    } else {
      if (this.isCrouching) {
        this.isCrouching = false;
        // Standard compact upright hitbox (height 120px)
        this.player.setSize(48, 120);
        this.player.setOffset(61, 105);
      }
    }

    // Horizontal acceleration & tilting
    if (this.inputState.right) {
      body.setAccelerationX(accel);
      if (body.velocity.x > maxSpeed) body.setVelocityX(maxSpeed);
      this.player.setFlipX(false);
      if (onGround && !this.isWobbling) {
        if (this.isCrouching) {
          this.player.setTexture('sema_crouch');
          this.player.setAngle(0);
        } else if (this.isTiltback) {
          this.player.setTexture('sema_tiltback');
          const tiltDeg = this.battery <= 10 ? 25 : 18;
          this.player.setAngle(-tiltDeg);
        } else {
          this.player.setAngle(0);
          this.player.setTexture(this.isBoosting ? 'sema_boost' : 'sema_lean_fwd');
        }
      }
    } else if (this.inputState.left) {
      body.setAccelerationX(-accel);
      if (body.velocity.x < -maxSpeed) body.setVelocityX(-maxSpeed);
      this.player.setFlipX(true);
      if (onGround && !this.isWobbling) {
        if (this.isCrouching) {
          this.player.setTexture('sema_crouch');
          this.player.setAngle(0);
        } else if (this.isTiltback) {
          this.player.setTexture('sema_tiltback');
          const tiltDeg = this.battery <= 10 ? 25 : 18;
          this.player.setAngle(tiltDeg);
        } else {
          this.player.setAngle(0);
          this.player.setTexture(this.isBoosting ? 'sema_boost' : 'sema_lean_fwd');
        }
      }
    } else {
      body.setAccelerationX(0);
      if (onGround && !this.isWobbling) {
        if (this.isCrouching) {
          this.player.setTexture('sema_crouch');
          this.player.setAngle(0);
        } else if (this.isTiltback) {
          this.player.setTexture('sema_tiltback');
          const tiltDeg = this.battery <= 10 ? 25 : 18;
          this.player.setAngle(this.player.flipX ? tiltDeg : -tiltDeg);
        } else if (Math.abs(body.velocity.x) > 30) {
          // Braking / coasting lean
          this.player.setTexture('sema_lean_back');
          this.player.setAngle(0);
        } else {
          this.player.setTexture('sema_normal');
          this.player.setAngle(0);
        }
      }
    }

    // In air posture & tiltback
    if (!onGround && !this.isWobbling && !this.isInvulnerable) {
      if (this.isTiltback) {
        this.player.setTexture('sema_tiltback');
        const tiltDeg = this.battery <= 10 ? 25 : 18;
        this.player.setAngle(this.player.flipX ? tiltDeg : -tiltDeg);
      }
    }

    // Fast fall in air
    if (this.inputState.down && !onGround) {
      body.setVelocityY(Math.max(body.velocity.y, 480)); // fast descent
    }

    // Jump
    if (this.inputState.jump && onGround) {
      const speedRatio = Math.abs(body.velocity.x) / maxSpeed;
      const jumpImpulse = -580 - speedRatio * 110;
      body.setVelocityY(jumpImpulse);
      soundManager.playJump();
      this.player.setTexture('sema_air');
    }

    // Dynamic motor sound pitch tracking - active ONLY while wheel is rolling!
    const currentSpeed = Math.abs(body.velocity.x);
    const currentSpeedRatio = Math.min(1, currentSpeed / maxSpeed);
    if (!this.isVictory && !this.isGameOver && currentSpeed > 15) {
      soundManager.updateMotorSpeed(currentSpeedRatio, this.isBoosting);
    } else {
      soundManager.updateMotorSpeed(0, false);
    }
  }

  private handlePlayerLand() {
    if (!this.isAirborne) return;

    this.isAirborne = false;
    soundManager.playLand(Math.abs(this.player.body?.velocity.y || 0) > 400);

    // Evaluate trick performance!
    const airDuration = (this.time.now - this.airStartTime) / 1000;
    const distanceCovered = Math.abs(this.player.x - this.airStartX);
    const landingAngle = Math.abs(this.player.angle);

    // Safe landing window is between -35 and +35 degrees
    if (landingAngle <= 35) {
      // Smooth landing! Check for trick completions
      let trickName: string | null = null;
      let trickScore = 0;

      if (this.airRotationTotal >= 300) {
        trickName = RU.trickMiniFlip;
        trickScore = 500;
      } else if (distanceCovered >= 360) {
        trickName = RU.trickLongJump;
        trickScore = 350;
      } else if (airDuration >= 1.2) {
        trickName = RU.trickHighDrop;
        trickScore = 400;
      } else if (landingAngle <= 8 && distanceCovered > 150) {
        trickName = RU.trickPerfectLanding;
        trickScore = 200;
      }

      if (trickName) {
        this.tricksCount++;
        this.combo = Math.min(5, this.combo + 1);
        const earned = trickScore * this.combo;
        this.score += earned;
        this.triggerTrick(trickName, this.combo);
        soundManager.playTrickSuccess();
      } else {
        this.combo = 1;
      }

      // Reset angle to upright
      this.tweens.add({
        targets: this.player,
        angle: 0,
        duration: 120,
        ease: 'Cubic.easeOut',
      });
    } else {
      // Clumsy landing: stumble
      this.combo = 1;
      this.triggerSpeech('НУ ПОЧТИ...');
      this.tweens.add({
        targets: this.player,
        angle: 0,
        duration: 250,
        ease: 'Bounce.easeOut',
      });
    }
  }

  private handleRampLaunch(playerObj: any, rampObj: any) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.x > 80 && body.velocity.y >= -50) {
      body.setVelocityY(-650);
      body.setVelocityX(body.velocity.x * 1.25);
      soundManager.playJump();
      this.triggerSpeech(RU.rampJump); // «ПОЛЕТЕЛ!»
    }
  }

  private handleCollectVolt(playerObj: any, voltObj: any) {
    voltObj.destroy();
    this.voltsCollected++;
    this.score += 100 * this.combo;
    soundManager.playVolt();

    // Floating score popup
    this.createFloatingText(this.player.x, this.player.y - 40, `+${100 * this.combo}⚡`, '#fbbf24');
  }

  private handleCollectBattery(playerObj: any, batteryObj: any) {
    batteryObj.destroy();
    this.battery = Math.min(100, this.battery + 35);
    this.score += 250;
    soundManager.playBattery();

    if (this.isTiltback && this.battery > 25) {
      this.isTiltback = false;
      this.player.setAngle(0);
      this.triggerSpeech('ЗАРЯДИЛСЯ! ПЕДАЛИ В НОРМЕ!');
    } else {
      this.triggerSpeech('ЗАРЯД +35%');
    }
    this.createFloatingText(this.player.x, this.player.y - 40, '🔋 +35%', '#34d399');
  }

  private handleUseChargingStation(playerObj: any, stationObj: any) {
    const station = stationObj as Phaser.Physics.Arcade.Sprite;
    const lastCharged = station.getData('lastCharged') || 0;
    const now = this.time.now;
    if (now - lastCharged < 5000) return; // Cooldown per station
    station.setData('lastCharged', now);

    this.battery = 100;
    soundManager.playChargeStation();

    if (this.isTiltback) {
      this.isTiltback = false;
      this.player.setAngle(0);
      this.triggerSpeech('⚡ ЗАПРАВИЛСЯ! ПЕДАЛИ В НОРМЕ!');
    } else {
      this.triggerSpeech('⚡ ПОЛНАЯ ЗАПРАВКА 100%! ⚡');
    }

    this.createFloatingText(station.x, station.y - 75, '⚡ ЗАПРАВКА 100% ⚡', '#34d399');

    // Electric station bounce tween
    this.tweens.add({
      targets: station,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private handleCollectLightning(playerObj: any, lightningObj: any) {
    lightningObj.destroy();
    this.isSuperBoost = true;
    this.superBoostTimer = 8.0;
    this.battery = 100;
    this.score += 500;
    soundManager.playSuperBoost();
    this.triggerSpeech(RU.maxBoost);
    this.createFloatingText(this.player.x, this.player.y - 50, '⚡ МАКСИМАЛЬНЫЙ БУСТ! ⚡', '#fef08a');
  }

  private handleActivateCheckpoint(playerObj: any, cpObj: any) {
    const cp = cpObj as Phaser.Physics.Arcade.Sprite;
    if (cp.texture.key === 'checkpoint_inactive') {
      cp.setTexture('checkpoint_active');
      this.lastCheckpointX = cp.x;
      this.lastCheckpointY = 510;
      this.battery = 100;
      if (this.isTiltback) {
        this.isTiltback = false;
        this.player.setAngle(0);
      }
      soundManager.playCheckpoint();
      this.triggerSpeech(RU.checkpointSaved);
      this.createFloatingText(cp.x, cp.y - 60, '⚡ СОХРАНЕНО + 100% ЗАРЯД', '#10b981');
    }
  }

  private handleHitObstacle(playerObj: any, obstacleObj: any) {
    if (this.isInvulnerable || this.isGameOver || this.isVictory) return;
    if (!obstacleObj || obstacleObj.active === false) return;

    const p = this.player;
    const pBody = p.body as Phaser.Physics.Arcade.Body;
    const obs = obstacleObj as Phaser.GameObjects.GameObject & { x: number; y: number; texture?: { key: string }; active?: boolean };
    const obsX = obs.x;
    const obsY = obs.y;
    const texKey = obs.texture?.key || '';

    // Calculate shard colors for obstacle shatter
    let shardColors = [0xfacc15, 0x1e293b, 0xffffff, 0xf97316];
    if (texKey.includes('bench')) {
      shardColors = [0x8b5a2b, 0xa0522d, 0x5c4033, 0x334155, 0xd2b48c];
    } else if (texKey.includes('scooter')) {
      shardColors = [0xfacc15, 0xeab308, 0x0f172a, 0x38bdf8, 0xffffff];
    } else if (texKey.includes('cone')) {
      shardColors = [0xf97316, 0xffedd5, 0xe11d48, 0xffffff];
    } else if (texKey.includes('zaceper')) {
      shardColors = [0xef4444, 0x3b82f6, 0x1e293b, 0xfde047, 0xffffff];
    } else if (texKey.includes('storm_grate')) {
      shardColors = [0x334155, 0x475569, 0x0f172a, 0x94a3b8];
    } else if (texKey.includes('industrial_barrel')) {
      shardColors = [0xd97706, 0x22c55e, 0x84cc16, 0x1c1917, 0xf59e0b];
    } else if (texKey.includes('rooftop_vent')) {
      shardColors = [0x64748b, 0x94a3b8, 0xcfd8dc, 0x334155];
    } else if (texKey.includes('metro_hazard')) {
      shardColors = [0xef4444, 0xf59e0b, 0x1e293b, 0xffffff];
    } else if (texKey.includes('jersey_barrier')) {
      shardColors = [0x94a3b8, 0x64748b, 0xf97316, 0xffffff];
    } else if (texKey.includes('taxi')) {
      shardColors = [0xfacc15, 0xeab308, 0x0f172a, 0xf97316, 0xffffff, 0x38bdf8];
    }

    // Check if player is smashing the obstacle from above (прыжок/падение сверху)
    const obsBody = (obstacleObj as any).body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | undefined;
    const obsTop = obsBody ? obsBody.top : (obsY - 24);
    const pBottom = pBody.bottom;
    const isInAir = this.isAirborne || !pBody.blocked.down || pBody.velocity.y !== 0;
    const isDescendingOrApex = pBody.velocity.y >= -40;
    const isAboveObstacle = pBottom <= obsTop + 34 || p.y < obsY - 20;

    const isStompFromAbove = isInAir && isDescendingOrApex && isAboveObstacle;

    if (isStompFromAbove) {
      // 🌟 РАЗБИВАНИЕ СВЕРХУ: МОНОКОЛЕСНИК НЕ СТРАДАЕТ, А ПОЛУЧАЕТ БОНУС УЛЫБКИ! 🌟
      // 1. Shatter effect
      this.createShatterEffect(obsX, obsY, shardColors);

      if (texKey.includes('taxi')) {
        soundManager.playTaxiHonk();
        this.createSpeechBubble(obsX, obsY - 62, `«${RU.taxiShout}»`);
        this.createEjectedDriverEffect(obsX, obsY);
      }

      // Destroy the smashed obstacle
      obstacleObj.destroy();

      // 2. Unicycle rider does not suffer (no damage, no speed penalty)
      if (this.shields < this.maxShields) {
        this.shields++;
      }
      this.combo = Math.min(10, this.combo + 1);
      const bonusPoints = 350 * this.combo;
      this.score += bonusPoints;
      this.battery = Math.min(100, this.battery + 15);
      this.tricksCount++;

      // 3. Cheerful bounce upward off the obstacle
      const bounceVelY = this.inputState.jump ? -520 : -420;
      pBody.setVelocityY(bounceVelY);
      this.isAirborne = true;

      // 4. Sound & Speech for smile bonus
      soundManager.playSmileBonus();
      this.triggerSpeech(RU.smileBonusSpeech || 'УЛЫБНИСЬ! МУХА-ХА!');

      // 5. Floating text: "БОНУС УЛЫБКИ!"
      this.createFloatingText(obsX, obsY - 55, `😊 ${RU.smileBonus || 'БОНУС УЛЫБКИ!'} +${bonusPoints}`, '#facc15');
      this.createFloatingText(p.x, p.y - 75, '😄✨ МУХА-ХА! ✨😄', '#38bdf8');

      // 6. Expanding golden smile shockwave & emoji burst
      const smileWave = this.add.circle(obsX, obsY - 10, 16, 0xfacc15, 0.9);
      smileWave.setDepth(16);
      this.tweens.add({
        targets: smileWave,
        scale: 4.5,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => smileWave.destroy(),
      });

      const emojis = ['😊', '😄', '⭐', '✨'];
      for (let i = 0; i < 4; i++) {
        const em = this.add.text(obsX + (i - 1.5) * 22, obsY - 20, emojis[i % emojis.length], {
          fontSize: '22px',
        }).setOrigin(0.5).setDepth(18);
        this.tweens.add({
          targets: em,
          y: obsY - 80 - Phaser.Math.Between(10, 40),
          x: em.x + Phaser.Math.Between(-30, 30),
          alpha: 0,
          scale: 1.4,
          duration: 650,
          ease: 'Back.easeOut',
          onComplete: () => em.destroy(),
        });
      }

      // 7. Brief invulnerability buffer (180ms)
      this.isInvulnerable = true;
      this.time.delayedCall(180, () => {
        this.isInvulnerable = false;
      });

      this.emitStats();
      return;
    }

    // Обычное горизонтальное столкновение на ходу: урон и потеря щитов
    this.shields--;
    soundManager.playHit();
    this.cameras.main.shake(200, 0.018);

    // Speed loss and knockback from hitting a solid object
    pBody.setVelocityX(pBody.velocity.x * 0.35);

    if (texKey.includes('taxi')) {
      soundManager.playTaxiHonk();
      soundManager.speakTaxiVoice(RU.taxiPhoneShout);
      soundManager.speakTaxiSmashVoice();
      this.createSpeechBubble(obsX, obsY - 62, `«${RU.taxiShout}»`);
      this.createSpeechBubble(obsX, obsY - 88, `«${RU.taxiSmashShout}»`);
      this.createEjectedDriverEffect(obsX, obsY);
    }
    this.createShatterEffect(obsX, obsY, shardColors);

    // Destroy the hit obstacle so player doesn't get stuck colliding in place
    obstacleObj.destroy();

    // Reset combo on hit
    this.combo = 1;

    // Damage / Game Over check
    if (this.shields <= 0) {
      this.createFloatingText(p.x, p.y - 70, '💥 СТОЛКНОВЕНИЕ! 💥', '#ef4444');
      this.triggerGameOver();
    } else {
      // Temporary invulnerability flashing
      this.isInvulnerable = true;
      this.createFloatingText(p.x, p.y - 65, `⚠ УРОН! ЩИТОВ: ${this.shields}`, '#f59e0b');
      this.triggerSpeech(RU.phrases[4] || 'ОЙ!');
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        yoyo: true,
        repeat: 5,
        duration: 140,
        onComplete: () => {
          if (this.player) {
            this.player.setAlpha(1);
          }
          this.isInvulnerable = false;
        },
      });
    }
  }

  private handleHitDrone(playerObj: any, droneObj: any) {
    if (this.isInvulnerable || this.isGameOver || this.isVictory) return;
    if (!droneObj || droneObj.active === false) return;

    const p = this.player;
    const pBody = p.body as Phaser.Physics.Arcade.Body;
    const drone = droneObj as Phaser.Physics.Arcade.Sprite;

    // Check if player lands/stomps the drone from above (or high jump onto it)
    const droneTop = drone.body ? drone.body.top : (drone.y - 18);
    const pBottom = pBody.bottom;
    const isInAir = this.isAirborne || !pBody.blocked.down || pBody.velocity.y !== 0;
    const isDescendingOrApex = pBody.velocity.y >= -40;
    const isAboveDrone = pBottom <= droneTop + 34 || p.y < drone.y - 14;

    const isStompFromAbove = isInAir && isDescendingOrApex && isAboveDrone;

    if (isStompFromAbove) {
      // 🌟 ДРОН СБИТ СВЕРХУ: МОНОКОЛЕСНИК ПОЛУЧАЕТ БОНУС УЛЫБКИ! 🌟
      const dX = drone.x;
      const dY = drone.y;

      // Shatter drone parts (metallic shards, cyan props, LED sparks)
      this.createShatterEffect(dX, dY, [0x0f172a, 0x38bdf8, 0xf59e0b, 0xef4444, 0x22c55e]);
      drone.destroy();

      if (this.shields < this.maxShields) {
        this.shields++;
      }
      this.combo = Math.min(10, this.combo + 1);
      const bonusPoints = 500 * this.combo;
      this.score += bonusPoints;
      this.battery = Math.min(100, this.battery + 20);
      this.tricksCount++;

      // Cheerful bounce upward
      pBody.setVelocityY(this.inputState.jump ? -550 : -450);
      this.isAirborne = true;

      // Sound & Speech for smile bonus
      soundManager.playSmileBonus();
      this.triggerSpeech(RU.smileBonusSpeech || 'УЛЫБНИСЬ! МУХА-ХА!');

      this.createFloatingText(dX, dY - 50, `😊 ${RU.smileBonus || 'БОНУС УЛЫБКИ!'} +${bonusPoints}`, '#facc15');
      this.createFloatingText(dX, dY - 24, RU.droneSmashed || 'ДРОН СБИТ! ХИ-ХИ БОЛЬШЕ НЕТ!', '#10b981');

      // Golden smile wave
      const smileWave = this.add.circle(dX, dY, 16, 0xfacc15, 0.9);
      smileWave.setDepth(16);
      this.tweens.add({
        targets: smileWave,
        scale: 4.5,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => smileWave.destroy(),
      });

      // Brief invulnerability buffer
      this.isInvulnerable = true;
      this.time.delayedCall(200, () => {
        this.isInvulnerable = false;
      });

      this.emitStats();
      return;
    }

    // Side collision with drone: standard obstacle hit
    this.handleHitObstacle(playerObj, droneObj);
  }

  private handleHitPoop(playerObj: any, poopObj: any) {
    if (this.isInvulnerable || this.isGameOver || this.isVictory) return;
    if (!poopObj || poopObj.active === false) return;

    const sourceDrone = poopObj.getData('sourceDrone') as Phaser.Physics.Arcade.Sprite | undefined;
    const poopX = poopObj.x;
    const poopY = poopObj.y;
    poopObj.destroy();

    const p = this.player;
    const pBody = p.body as Phaser.Physics.Arcade.Body;

    // Obstacle damage: shields loss!
    this.shields--;
    soundManager.playHit();
    soundManager.playPoopSplatSound();
    this.cameras.main.shake(200, 0.018);

    // Speed loss and knockback from poop impact
    pBody.setVelocityX(pBody.velocity.x * 0.35);

    // Poop splat on ground / road
    this.createPoopSplat(poopX, Math.min(poopY, 578));

    // Splat splash on player body
    for (let i = 0; i < 10; i++) {
      const drop = this.add.circle(
        p.x + Phaser.Math.Between(-15, 15),
        p.y + Phaser.Math.Between(-35, 15),
        Phaser.Math.Between(3, 5),
        0x78350f
      );
      drop.setDepth(15);
      this.tweens.add({
        targets: drop,
        y: drop.y + Phaser.Math.Between(15, 45),
        x: drop.x + Phaser.Math.Between(-25, 25),
        alpha: 0,
        duration: 500,
        onComplete: () => drop.destroy(),
      });
    }

    // Floating text on Sema
    this.createFloatingText(p.x, p.y - 70, `💩 ${RU.hitPoopAlert || 'КАКАШКА С ДРОНА!'} -1 ЩИТ`, '#854d0e');

    // 🌟 ДРОН СМЕЕТСЯ ХИ-ХИ ГОЛОСОМ СМЕШНОГО ГНОМА! 🌟
    soundManager.speakGnomeLaugh();

    // Find the drone that dropped it or nearest drone
    let droneToLaugh = sourceDrone;
    if (!droneToLaugh || !droneToLaugh.active) {
      let minDist = 999999;
      (this.drones.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((d) => {
        if (!d.active) return;
        const dist = Math.abs(d.x - p.x);
        if (dist < minDist) {
          minDist = dist;
          droneToLaugh = d;
        }
      });
    }

    if (droneToLaugh && droneToLaugh.active) {
      // Speech bubble above drone
      this.createSpeechBubble(droneToLaugh.x, droneToLaugh.y - 50, `«${RU.droneGnomeHit || 'ХИ-ХИ! ПОПАЛ!'}»`);
      // Floating text with gnome icon
      this.createFloatingText(droneToLaugh.x, droneToLaugh.y - 32, '🧙‍♂️ ХИ-ХИ-ХИ! 😆', '#facc15');

      // Funny victory bounce animation for the drone
      this.tweens.add({
        targets: droneToLaugh,
        y: droneToLaugh.y - 25,
        yoyo: true,
        repeat: 3,
        duration: 140,
        ease: 'Quad.easeInOut',
      });
    }

    // Reset combo
    this.combo = 1;

    // Damage / Game Over check
    if (this.shields <= 0) {
      this.createFloatingText(p.x, p.y - 85, '💥 КРИТИЧЕСКИЙ УРОН! 💥', '#ef4444');
      this.triggerGameOver();
    } else {
      // Temporary invulnerability flashing
      this.isInvulnerable = true;
      this.triggerSpeech(RU.phrases[4] || 'ОЙ!');
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        yoyo: true,
        repeat: 5,
        duration: 140,
        onComplete: () => {
          if (this.player) {
            this.player.setAlpha(1);
          }
          this.isInvulnerable = false;
        },
      });
    }

    this.emitStats();
  }

  private createPoopSplat(x: number, y: number) {
    const splat = this.add.image(x, y, 'poop_splat');
    splat.setDepth(8);
    splat.setScale(0.85);
    this.tweens.add({
      targets: splat,
      scaleX: 1.25,
      scaleY: 1.15,
      alpha: 0,
      delay: 2400,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => splat.destroy(),
    });

    // Brown splash particles
    for (let i = 0; i < 6; i++) {
      const drop = this.add.circle(
        x + Phaser.Math.Between(-12, 12),
        y - Phaser.Math.Between(2, 14),
        Phaser.Math.Between(2, 4),
        0x78350f
      );
      drop.setDepth(9);
      this.tweens.add({
        targets: drop,
        y: y + Phaser.Math.Between(2, 8),
        x: drop.x + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 450,
        onComplete: () => drop.destroy(),
      });
    }
  }

  private createShatterEffect(x: number, y: number, colorPalette: number[]) {
    // Spawn 16 high-velocity shards that scatter in all directions with gravity & rotation
    const shardCount = 16;
    for (let i = 0; i < shardCount; i++) {
      const color = Phaser.Math.RND.pick(colorPalette);
      const w = Phaser.Math.Between(5, 14);
      const h = Phaser.Math.Between(4, 12);
      const shard = this.add.rectangle(
        x + Phaser.Math.Between(-16, 16),
        y + Phaser.Math.Between(-12, 12),
        w,
        h,
        color
      );
      shard.setDepth(15);
      this.physics.add.existing(shard);
      const sb = shard.body as Phaser.Physics.Arcade.Body;
      sb.setVelocity(
        Phaser.Math.Between(-320, 320),
        Phaser.Math.Between(-460, -140)
      );
      sb.setGravityY(780);
      sb.setAngularVelocity(Phaser.Math.Between(-420, 420));

      this.tweens.add({
        targets: shard,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(500, 750),
        delay: 150,
        onComplete: () => shard.destroy(),
      });
    }

    // Expanding visual impact shockwave
    const shockwave = this.add.circle(x, y, 14, 0xfacc15, 0.9);
    shockwave.setDepth(14);
    this.tweens.add({
      targets: shockwave,
      scale: 3.8,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => shockwave.destroy(),
    });
  }

  private handlePuddleSlip() {
    if (this.isInvulnerable || this.isWobbling) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Puddle causes slight loss of traction
    body.setVelocityX(body.velocity.x * 0.7);
    this.player.setAngle(this.player.flipX ? 12 : -12);
  }

  private triggerWobble() {
    this.isWobbling = true;
    this.wobbleTimer = 1.8;
    this.nextWobbleDistance = this.distance + Phaser.Math.Between(450, 750);
    soundManager.playWobbleAlert();
    this.cameras.main.shake(120, 0.008);
    this.triggerSpeech(RU.wobble); // «ВОБЛА!»
  }

  private triggerCutout(reason: 'speed' | 'boost' = 'speed') {
    if (this.isCutout || this.isGameOver || this.isVictory) return;
    this.isCutout = true;
    this.cutoutReason = reason;
    this.currentPwm = 100;
    this.maxPwm = 100;

    // Dramatic cutout effects: screen shake, red flash, alert sounds
    this.cameras.main.shake(650, 0.04);
    this.cameras.main.flash(220, 255, 45, 45);

    soundManager.playCutout();

    if (reason === 'boost') {
      this.createFloatingText(this.player.x, this.player.y - 85, '💥 ПРОДАВ! БУСТ > 3 СЕК! 💥', '#ef4444');
      this.triggerSpeech(RU.semaCutoutBoostSpeech || 'ПРОДАВ! ПЕРЕДЕРЖАЛ БУСТ!');
    } else {
      this.createFloatingText(this.player.x, this.player.y - 85, '⚡ ПРОДАВ КОЛЕСА! 150+ КМ/Ч! ⚡', '#f59e0b');
      this.triggerSpeech(RU.semaCutoutSpeech || 'ПРОДАВ! 150 КМ/Ч!');
    }

    // Trigger fall / game over
    this.triggerGameOver();
  }

  private triggerGameOver() {
    if (this.isGameOver || this.isVictory) return;
    this.isGameOver = true;
    this.isInvulnerable = true;
    this.inputState = { left: false, right: false, jump: false, boost: false, down: false };
    this.isBoosting = false;
    this.boostHoldDuration = 0;
    this.fallsCount++;
    soundManager.stopMotor();
    soundManager.playHit();

    // Clean up any lingering timers
    if (this.skeletonTimer) {
      this.skeletonTimer.remove();
      this.skeletonTimer = null;
    }
    if (this.gameOverTimer) {
      this.gameOverTimer.remove();
      this.gameOverTimer = null;
    }
    if (this.victoryTimer) {
      this.victoryTimer.remove();
      this.victoryTimer = null;
    }
    if (this.physics?.world) {
      this.physics.world.timeScale = 1.0;
    }

    // 1. Sema falls down ("Сёма прилёг")
    this.player.setTexture('sema_fall');
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.setAngle(this.player.flipX ? 60 : -60);

    // 2. Floating text & speech
    this.createFloatingText(this.player.x, this.player.y - 75, '💥 СЁМА ПРИЛЁГ! 💥', '#f43f5e');
    this.triggerSpeech('ОЙ, ПРИЛЁГ!');

    // 3. Impact shockwave aura
    const shockwave = this.add.circle(this.player.x, this.player.y + 35, 20, 0xf43f5e, 0.85);
    shockwave.setDepth(16);
    this.tweens.add({
      targets: shockwave,
      scale: 4.2,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => shockwave.destroy(),
    });

    // Fast, responsive 750ms transition to checkpoint dialog
    this.gameOverTimer = this.time.delayedCall(750, () => {
      this.gameOverTimer = null;
      this.onGameOver();
    });
  }

  public respawnAtCheckpoint() {
    if (!this.isSceneReady || !this.player) return;

    // 1. Cancel death strobe, game over, and victory timers immediately
    if (this.skeletonTimer) {
      this.skeletonTimer.remove();
      this.skeletonTimer = null;
    }
    if (this.gameOverTimer) {
      this.gameOverTimer.remove();
      this.gameOverTimer = null;
    }
    if (this.victoryTimer) {
      this.victoryTimer.remove();
      this.victoryTimer = null;
    }

    // 2. Kill existing tweens on the player
    if (this.tweens) {
      this.tweens.killTweensOf(this.player);
    }

    // 3. Reset game state flags and stats
    this.isGameOver = false;
    this.isVictory = false;
    this.inputState = { left: false, right: false, jump: false, boost: false, down: false };
    this.isBoosting = false;
    if (this.poopProjectiles) {
      this.poopProjectiles.clear(true, true);
    }
    if (this.physics?.world) {
      this.physics.world.timeScale = 1.0;
    }
    this.shields = this.maxShields;
    this.battery = 100;
    this.isTiltback = false;
    this.tiltbackBeepTimer = 0;
    this.tiltbackSpeechTimer = 0;
    this.player.setPosition(this.lastCheckpointX, 540);
    this.player.setVelocity(0, 0);
    this.player.setAngle(0);
    this.player.setAlpha(1);
    this.isCrouching = false;
    this.isCutout = false;
    this.cutoutReason = undefined;
    this.boostHoldDuration = 0;
    this.boostWarningTimer = 0;
    this.currentPwm = 0;
    this.speedKmh = 0;
    this.isOverspeed = false;
    this.overspeedBeepTimer = 0;
    this.isWobbling = false;
    this.wobbleTimer = 0;
    this.isAirborne = false;
    this.player.setSize(48, 120);
    this.player.setOffset(61, 105);
    this.player.setTexture('sema_normal');
    if (this.playerWheelLight) {
      this.playerWheelLight.setFillStyle(0x00ffff, 0.7);
    }

    // 4. Snap camera directly to respawn location
    if (this.cameras?.main) {
      this.cameras.main.scrollX = Math.max(0, this.lastCheckpointX - 145);
    }

    // 5. Brief invulnerability visual feedback
    this.isInvulnerable = true;
    if (this.tweens) {
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        yoyo: true,
        repeat: 4,
        duration: 150,
        onComplete: () => {
          if (this.player) {
            this.player.setAlpha(1);
          }
          this.isInvulnerable = false;
        },
      });
    }

    // 6. Start motor and emit fresh stats
    soundManager.startMotor();
    this.emitStats();
  }

  private handleFinish() {
    if (this.isVictory || this.isGameOver) return;
    if (this.player.x < this.levelConfig.length - 600) return;

    this.isVictory = true;
    this.isInvulnerable = true;
    soundManager.stopMotor();

    // Clean up any lingering timers
    if (this.skeletonTimer) {
      this.skeletonTimer.remove();
      this.skeletonTimer = null;
    }
    if (this.gameOverTimer) {
      this.gameOverTimer.remove();
      this.gameOverTimer = null;
    }
    if (this.victoryTimer) {
      this.victoryTimer.remove();
      this.victoryTimer = null;
    }

    soundManager.playTrickSuccess();
    this.createFloatingText(this.player.x, this.player.y - 80, `🏁 УРОВЕНЬ ${this.levelConfig.id} ПРОЙДЕН! 🏁`, '#10b981');
    this.triggerSpeech(`УРОВЕНЬ ${this.levelConfig.id} ПРОЙДЕН!`);

    // Slow motion finish jump!
    if (this.physics?.world) {
      this.physics.world.timeScale = 0.5;
    }

    this.victoryTimer = this.time.delayedCall(1200, () => {
      if (this.physics?.world) {
        this.physics.world.timeScale = 1.0;
      }
      this.victoryTimer = null;
      this.onVictory();
    });
  }

  private updateLightsAndEffects() {
    const isFlip = this.player.flipX;
    const bodyX = this.player.x;
    const bodyY = this.player.y;

    // Headlight position at front of EUC
    const lightOffset = isFlip ? -26 : 26;
    const lightY = this.isCrouching ? bodyY + 54 : bodyY + 48;
    this.headlightBeam.setPosition(bodyX + lightOffset, lightY);
    this.headlightBeam.setScale((isFlip ? -1 : 1) * 0.72, 0.72);

    // Wheel glow position
    this.playerWheelLight.setPosition(bodyX, bodyY + 52);
    this.playerWheelLight.setScale(0.72);
    const wheelGlowColor = this.isOverspeed
      ? 0xef4444 // Intense red warning glow when exceeding 10 km/h!
      : this.isSuperBoost
      ? 0xfbbf24
      : this.isBoosting
      ? 0x38bdf8
      : 0xf59e0b;

    this.playerWheelLight.setFillStyle(
      wheelGlowColor,
      this.isOverspeed ? 0.75 : this.isBoosting ? 0.7 : 0.35
    );

    // Boost particle trail
    if (this.isBoosting || this.isSuperBoost) {
      this.trailEmitter.start();
      this.trailEmitter.setPosition(bodyX + (isFlip ? 22 : -22), bodyY + 50);
    } else {
      this.trailEmitter.stop();
    }
  }

  private updateAtmosphere() {
    const theme = this.levelConfig.theme;
    const levelId = this.levelConfig.id;
    const d = this.distance;

    if (levelId === 10) {
      // Underground Metro tunnel: dark subterranean stone with warm sodium lights
      this.skyLayer.setFillStyle(0x0c0a09);
      this.headlightBeam.setAlpha(0.95);
    } else if (levelId === 1 || levelId === 4 || levelId === 15) {
      // Park & Embankment
      if (theme === 'night-neon') {
        this.skyLayer.setFillStyle(0x042f2e);
        this.headlightBeam.setAlpha(0.75);
      } else {
        this.skyLayer.setFillStyle(0x0284c7);
        this.headlightBeam.setAlpha(0.35);
      }
    } else if (levelId === 2 || levelId === 9) {
      // Rooftops: panoramic twilight sky with distant city glow
      this.skyLayer.setFillStyle(0x1e1b4b);
      this.headlightBeam.setAlpha(0.8);
    } else if (theme === 'night-neon') {
      this.skyLayer.setFillStyle(0x090d16);
      this.headlightBeam.setAlpha(0.8);
    } else if (theme === 'industrial') {
      this.skyLayer.setFillStyle(0x18181b);
      this.headlightBeam.setAlpha(0.65);
    } else if (theme === 'sunset-highway') {
      this.skyLayer.setFillStyle(0xc2410c);
      this.headlightBeam.setAlpha(0.5);
    } else if (theme === 'storm') {
      this.skyLayer.setFillStyle(0x1e1b4b);
      this.headlightBeam.setAlpha(0.85);
    } else if (theme === 'cyber') {
      this.skyLayer.setFillStyle(0x020617);
      this.headlightBeam.setAlpha(0.9);
    } else {
      // day-to-night
      if (d < 500) {
        this.skyLayer.setFillStyle(0x38bdf8);
        this.headlightBeam.setAlpha(0.25);
      } else if (d < 1100) {
        this.skyLayer.setFillStyle(0x9a3412); // Warm sunset
        this.headlightBeam.setAlpha(0.45);
      } else {
        this.skyLayer.setFillStyle(0x090d16); // Night with neon
        this.headlightBeam.setAlpha(0.75);
      }
    }
  }

  private triggerSpeech(text: string) {
    this.activeSpeechString = text;
    this.speechTimer = 1.8;
  }

  private triggerTrick(trickName: string, combo: number) {
    this.trickPopupString = `${trickName} x${combo}!`;
    this.speechTimer = 2.0;
  }

  private createFloatingText(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Rubik, Montserrat, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: t,
      y: y - 45,
      alpha: 0,
      duration: 800,
      ease: 'Power1',
      onComplete: () => t.destroy(),
    });
  }

  // Comic speech balloon floating over characters (e.g. yelling taxi driver)
  private createSpeechBubble(x: number, y: number, text: string) {
    const container = this.add.container(x, y);
    container.setDepth(25);

    const paddingX = 14;
    const paddingY = 8;

    const t = this.add
      .text(0, -3, text, {
        fontFamily: 'Rubik, Montserrat, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#b91c1c', // Comic alert red
        stroke: '#ffffff',
        strokeThickness: 1.5,
      })
      .setOrigin(0.5);

    const bw = Math.max(90, t.width + paddingX * 2);
    const bh = t.height + paddingY * 2;

    const bubbleBg = this.add.graphics();
    // Shadow
    bubbleBg.fillStyle(0x000000, 0.25);
    bubbleBg.fillRoundedRect(-bw / 2 + 2, -bh / 2 + 2, bw, bh, 8);

    // Balloon body
    bubbleBg.fillStyle(0xffffff, 0.98);
    bubbleBg.lineStyle(2.5, 0x0f172a, 1);
    bubbleBg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bubbleBg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    // Comic pointer triangle pointing down towards the taxi driver's open window
    bubbleBg.fillStyle(0xffffff, 0.98);
    bubbleBg.beginPath();
    bubbleBg.moveTo(-6, bh / 2 - 1);
    bubbleBg.lineTo(0, bh / 2 + 9);
    bubbleBg.lineTo(6, bh / 2 - 1);
    bubbleBg.closePath();
    bubbleBg.fillPath();

    bubbleBg.beginPath();
    bubbleBg.moveTo(-6, bh / 2);
    bubbleBg.lineTo(0, bh / 2 + 9);
    bubbleBg.lineTo(6, bh / 2);
    bubbleBg.strokePath();

    container.add([bubbleBg, t]);

    // Pop-in scale bounce animation, pause, then float up and fade out
    container.setScale(0.2);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          y: y - 28,
          alpha: 0,
          scale: 0.85,
          delay: 1300,
          duration: 500,
          ease: 'Power2',
          onComplete: () => container.destroy(),
        });
      },
    });
  }

  // Comical cartoon taxi driver flying out when his yellow taxi is smashed
  private createEjectedDriverEffect(x: number, y: number) {
    const driverContainer = this.add.container(x, y - 10);
    driverContainer.setDepth(26);

    const g = this.add.graphics();
    // Torso / blue jacket
    g.fillStyle(0x1e3a8a, 1);
    g.fillRoundedRect(-12, 10, 24, 20, 4);

    // Panicked arms waving up
    g.fillStyle(0xd4976a, 1);
    g.fillCircle(-16, 8, 4);
    g.fillCircle(16, 8, 4);
    g.lineStyle(3, 0x1e3a8a, 1);
    g.strokeLineShape(new Phaser.Geom.Line(-8, 14, -16, 8));
    g.strokeLineShape(new Phaser.Geom.Line(8, 14, 16, 8));

    // Head
    g.fillStyle(0xd4976a, 1);
    g.fillCircle(0, 0, 12);

    // Cap with visor
    g.fillStyle(0x0f172a, 1);
    g.beginPath();
    g.arc(0, -2, 12, Math.PI, 0);
    g.fill();
    g.fillRect(-14, -4, 16, 4);

    // Wide shocked cartoon eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-4, -1, 4);
    g.fillCircle(4, -1, 4);
    g.fillStyle(0x000000, 1);
    g.fillCircle(-4, -1, 1.5);
    g.fillCircle(4, -1, 1.5);

    // Comical wide open screaming mouth (shouting "Ой!")
    g.fillStyle(0x7f1d1d, 1);
    g.fillEllipse(0, 6, 10, 8);
    g.fillStyle(0xffffff, 1);
    g.fillRect(-3, 3, 6, 2); // teeth
    g.fillStyle(0xef4444, 1);
    g.fillCircle(0, 8, 2.5); // tongue

    // Eyebrows slanted up in cartoon panic
    g.lineStyle(1.5, 0x000000, 1);
    g.strokeLineShape(new Phaser.Geom.Line(-7, -6, -2, -4));
    g.strokeLineShape(new Phaser.Geom.Line(7, -6, 2, -4));

    driverContainer.add(g);

    // Slapstick cartoon launch: pop up and spin wildly, then fall down
    const driftX = Phaser.Math.Between(-60, 60);
    this.tweens.add({
      targets: driverContainer,
      x: x + driftX,
      y: y - 130,
      angle: driftX > 0 ? 540 : -540,
      duration: 550,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: driverContainer,
          y: y + 80,
          angle: driftX > 0 ? 820 : -820,
          alpha: 0,
          scale: 0.6,
          duration: 450,
          ease: 'Quad.easeIn',
          onComplete: () => driverContainer.destroy(),
        });
      },
    });
  }

  public pauseGame() {
    if (this.isSceneReady && this.scene && typeof this.scene.pause === 'function') {
      try {
        this.scene.pause();
      } catch {
        // Ignore errors if scene is transitioning or destroyed
      }
    }
    soundManager.stopMotor();
  }

  public resumeGame() {
    if (this.isSceneReady && this.scene && typeof this.scene.resume === 'function') {
      try {
        this.scene.resume();
      } catch {
        // Ignore errors if scene is transitioning or destroyed
      }
    }
    soundManager.startMotor();
  }

  public destroyScene() {
    this.isSceneReady = false;
    if (this.skeletonTimer) {
      this.skeletonTimer.remove();
      this.skeletonTimer = null;
    }
    if (this.gameOverTimer) {
      this.gameOverTimer.remove();
      this.gameOverTimer = null;
    }
    if (this.victoryTimer) {
      this.victoryTimer.remove();
      this.victoryTimer = null;
    }
    if (this.physics?.world) {
      this.physics.world.timeScale = 1.0;
    }
    soundManager.stopAll();
  }
}
