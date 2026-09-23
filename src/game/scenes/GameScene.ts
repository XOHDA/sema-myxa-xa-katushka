import Phaser from 'phaser';
import { generateGameTextures, SKIN_PALETTES } from '../textures';
import { soundManager } from '../../audio/soundManager';
import { InputState, LevelConfig, PlayerStats, WeatherType, GarageUpgrades } from '../../types';
import { RU } from '../../localization/ru';

export class GameScene extends Phaser.Scene {
  private levelConfig: LevelConfig;
  private onStatsUpdate: (stats: PlayerStats) => void;
  private onGameOver: () => void;
  private onVictory: () => void;
  private upgrades: GarageUpgrades = {
    batteryLevel: 0,
    controllerLevel: 0,
    hydroLevel: 0,
    selectedSkin: 'emerald',
    unlockedSkins: ['emerald'],
    totalVolts: 0,
  };
  private onCollectVoltCallback?: () => void;
  private inputState: InputState = {
    left: false,
    right: false,
    jump: false,
    boost: false,
    down: false,
  };

  // Player & EUC
  private player!: Phaser.Physics.Arcade.Sprite;
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
  private comboProgress = 0; // 0 - 100% towards next combo tier
  private comboTimer = 0; // remaining seconds before decay
  private readonly comboMaxTimer = 3.2; // decay countdown
  private activeTrickType: 'jump' | 'grind' | 'balance' | null = null;
  private grindSparkTimer = 0;
  private grindScoreTimer = 0;
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
  public isSceneReady = false;
  private skeletonTimer: Phaser.Time.TimerEvent | null = null;
  private gameOverTimer: Phaser.Time.TimerEvent | null = null;
  private victoryTimer: Phaser.Time.TimerEvent | null = null;

  // Air & trick tracking
  private isAirborne = false;
  private airStartTime = 0;
  private airStartX = 0;
  private airStartY = 0;
  private airRotationTotal = 0;
  private airFlipProgress = 0;
  private completedFlipsCount = 0;
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
  private overheadObstacles!: Phaser.Physics.Arcade.StaticGroup;
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
  private eucWheel!: Phaser.GameObjects.Sprite;

  // Boost distortion visual FX & Camera Lens Warp
  private boostDistortionOverlay!: Phaser.GameObjects.Graphics;
  private boostLensTween: Phaser.Tweens.Tween | null = null;
  private boostDistortionTween: Phaser.Tweens.Tween | null = null;

  // Jump immediate handling & state
  private jumpTrajectoryGraphics: Phaser.GameObjects.Graphics | null = null;
  private isJumpHolding = false;
  private jumpHoldTimer = 0;
  private jumpTriggered = false;
  private jumpBufferTimer = 0;

  // Visuals & Sky
  private skyLayer!: Phaser.GameObjects.Rectangle;
  private bgCityLayer!: Phaser.GameObjects.Graphics;
  private finishArch!: Phaser.GameObjects.Image;
  private speechText: Phaser.GameObjects.Text | null = null;
  private speechTimer = 0;
  private activeSpeechString: string | null = null;
  private trickPopupString: string | null = null;

  // Dynamic Weather & Atmospheric Particle Emitters
  private currentWeather: WeatherType = 'clear';
  private weatherRainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weatherSnowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weatherSplashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private tireSprayEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weatherAtmosphereOverlay: Phaser.GameObjects.Graphics | null = null;
  private announcedWeatherTransitions: Set<WeatherType> = new Set();
  private slipWarningCooldown = 0;

  // High-Energy Spark Particle System (Falls, Collisions, VOLT Energy)
  private sparkImpactEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkFrictionEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkVoltEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Boss Fantomas on Monowheel SV (Duel Encounter)
  private bossSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private trackBoostPads!: Phaser.Physics.Arcade.StaticGroup;
  private bossDuelActive = false;
  private bossDuelIntroPlaying = false;
  private bossDistanceLead = 0;
  private bossStunned = false;
  private bossStunTimer = 0;
  private bossSlipstreamActive = false;
  private bossSlipstreamCharge = 0;
  private bossIntroTriggerX = 0;
  private bossIntroTriggered = false;
  private bossBoostTimer = 0;
  private bossTauntTimer = 0;
  private bossBaseSpeed = 360;
  private bossSlipstreamEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bossHeadlightBeam: Phaser.GameObjects.Polygon | null = null;
  private bossLetterboxTop: Phaser.GameObjects.Rectangle | null = null;
  private bossLetterboxBottom: Phaser.GameObjects.Rectangle | null = null;
  private bossDuelBannerContainer: Phaser.GameObjects.Container | null = null;

  constructor(
    levelConfig: LevelConfig,
    onStatsUpdate: (stats: PlayerStats) => void,
    onGameOver: () => void,
    onVictory: () => void,
    upgrades?: GarageUpgrades,
    onCollectVolt?: () => void
  ) {
    super({ key: 'GameScene' });
    this.levelConfig = levelConfig;
    this.currentWeather = levelConfig.weather || 'clear';
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;
    this.onVictory = onVictory;
    if (upgrades) {
      this.upgrades = upgrades;
    }
    this.onCollectVoltCallback = onCollectVolt;
  }

  public setInputState(input: InputState) {
    if (this.isGameOver || this.isVictory || this.bossDuelIntroPlaying) {
      this.inputState = { left: false, right: false, jump: false, boost: false, down: false };
      this.isBoosting = false;
      this.jumpTriggered = false;
      this.jumpBufferTimer = 0;
      return;
    }

    const jumpJustPressed = input.jump && !this.inputState.jump;
    this.inputState = { ...input };

    if (!input.jump) {
      this.jumpTriggered = false;
    }

    // ⚡ INSTANT JUMP TRIGGER: Jump immediately when button is pressed without trajectory delay
    if (jumpJustPressed) {
      this.jumpBufferTimer = 0.16; // 160ms jump buffer in case slightly airborne
      this.jumpTriggered = true;
      if (this.player?.body) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const onGround = body.blocked.down || body.touching.down;
        if (onGround && !this.isGameOver && !this.isVictory && !this.isCutout && !this.bossDuelIntroPlaying) {
          const maxSpeed = this.levelConfig.baseSpeed || 300;
          const speedRatio = Math.abs(body.velocity.x) / Math.max(1, maxSpeed);
          const jumpImpulse = -630 - speedRatio * 110;
          this.executeJump(jumpImpulse);
          this.jumpBufferTimer = 0;
        }
      }
    }
  }

  public preload() {
    // Generate procedural canvas textures with current player skin
    const skin = this.upgrades?.selectedSkin || 'emerald';
    generateGameTextures(this, skin, true);
  }

  public updateUpgrades(newUpgrades: GarageUpgrades) {
    this.upgrades = newUpgrades;
    const skin = newUpgrades.selectedSkin || 'emerald';
    generateGameTextures(this, skin, true);
    if (this.player && this.player.active) {
      const currentTex = this.player.texture?.key || 'sema_normal';
      this.player.setTexture(currentTex);
    }
    if (this.eucWheel && this.eucWheel.active) {
      this.eucWheel.setTexture(`euc_wheel_${skin}`);
    }
    if (this.headlightBeam) {
      const beamColor = SKIN_PALETTES[skin]?.headlightBeamHex || 0xfef08a;
      this.headlightBeam.setFillStyle(beamColor, 0.22);
    }
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

    // Dynamic Weather Emitters & Overlays
    this.setupWeatherSystem();

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
    this.overheadObstacles = this.physics.add.staticGroup();
    this.puddles = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.drones = this.physics.add.group();
    this.poopProjectiles = this.physics.add.group();
    this.trackBoostPads = this.physics.add.staticGroup();

    // 3. CREATE PLAYER SÉMA MUKHA-KHA FIRST (Must precede buildLevel and colliders)
    // Scaled to 0.72: compact, nimble, fits under all overhead bridges, signs, and arches!
    this.player = this.physics.add.sprite(120, 540, 'sema_normal');
    this.player.setScale(0.72);
    this.player.setOrigin(0.5, 0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    // Physics body tightly around EUC wheel contact point
    this.player.setSize(48, 120);
    this.player.setOffset(116, 138);
    this.player.setDepth(10);

    // Single rotating EUC wheel
    const activeSkin = this.upgrades?.selectedSkin || 'emerald';
    this.eucWheel = this.add.sprite(this.player.x, this.player.y, `euc_wheel_${activeSkin}`);
    this.eucWheel.setScale(0.72);
    this.eucWheel.setOrigin(0.5, 0.5);
    this.eucWheel.setDepth(9.9);

    // Headlight polygon attached to Sema's EUC (customized beam color per skin)
    const headlightColor = SKIN_PALETTES[activeSkin]?.headlightBeamHex || 0xfef08a;
    this.headlightBeam = this.add.polygon(
      0,
      0,
      [
        { x: 0, y: 0 },
        { x: 160, y: -40 },
        { x: 160, y: 50 },
      ],
      headlightColor,
      0.22
    );
    this.headlightBeam.setScale(0.72);
    this.headlightBeam.setDepth(9);

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
    this.physics.add.overlap(this.player, this.trackBoostPads, this.handleBoostPadOverlap, undefined, this);

    // Hazards & Obstacles
    this.physics.add.overlap(this.player, this.obstacles, this.handleHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.overheadObstacles, this.handleHitOverheadObstacle, undefined, this);
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

    // 7. BOOST SCREEN DISTORTION OVERLAY (Fixed to camera viewport, high depth)
    this.boostDistortionOverlay = this.add.graphics();
    this.boostDistortionOverlay.setScrollFactor(0);
    this.boostDistortionOverlay.setDepth(35);

    // 8. JUMP PREDICTED TRAJECTORY GRAPHICS (World space, between road and player)
    this.jumpTrajectoryGraphics = this.add.graphics();
    this.jumpTrajectoryGraphics.setDepth(18);

    // 9. DYNAMIC WEATHER & SPARK SYSTEMS INITIALIZATION
    this.setupWeatherSystem();
    this.setupSparkParticleSystem();
    this.setupBossDuelSystem();

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

    // 3. POPULATE THE STREET WITH OBSTACLES BEFORE DUEL, AND DEDICATED RACING TRACK DURING DUEL
    this.bossIntroTriggerX = Math.max(2600, Math.floor(worldWidth * 0.62));
    this.bossBaseSpeed = Math.round((this.levelConfig.baseSpeed || 300) * 1.05);

    const duelTrackStartX = this.bossIntroTriggerX - 100;

    // 3A. CITY SECTOR (WITH OBSTACLES, PEDESTRIANS, DRONES, PUZZLES) - ONLY BEFORE DUEL
    let segX = 520;
    while (segX < duelTrackStartX - 100) {
      const segLen = Phaser.Math.Between(480, 720);
      const nextEnd = Math.min(segX + segLen, duelTrackStartX);
      this.populateCitySegment(segX, nextEnd, groundY, tileKey);
      segX = nextEnd + Phaser.Math.Between(80, 160);
    }

    // 3B. DEDICATED HIGH-SPEED RACING TRACK FOR DUEL WITH FANTÔMAS
    // No obstacles, no hazards, no drones, no pedestrians! Clean racing speedway with kerbs, speed arches, boost pads & batteries!
    this.populateRacingTrackZone(duelTrackStartX, worldWidth - 550, groundY);

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

  private populateCitySegment(startX: number, endX: number, groundY: number, groundTileKey: string) {
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
    let availableOverheadObstacles = ['obstacle_overhead_barrier'];

    if (levelId === 1 || levelId === 4 || levelId === 15) {
      // Park & Embankment
      availableObstacles = ['obstacle_bench', 'obstacle_storm_grate', 'obstacle_cone'];
      availableOverheadObstacles = ['obstacle_overhead_branch', 'obstacle_overhead_barrier'];
    } else if (levelId === 2 || levelId === 9) {
      // Rooftops
      availableObstacles = ['obstacle_rooftop_vent', 'obstacle_bench', 'obstacle_cone'];
      availableOverheadObstacles = ['obstacle_overhead_barrier', 'obstacle_overhead_pipe'];
    } else if (levelId === 3 || levelId === 7) {
      // Industrial
      availableObstacles = ['obstacle_industrial_barrel', 'obstacle_jersey_barrier', 'obstacle_storm_grate'];
      availableOverheadObstacles = ['obstacle_overhead_pipe', 'obstacle_overhead_barrier'];
    } else if (levelId === 10) {
      // Metro
      availableObstacles = ['obstacle_metro_hazard', 'obstacle_storm_grate', 'obstacle_cone'];
      availableOverheadObstacles = ['obstacle_overhead_laser', 'obstacle_overhead_barrier'];
    } else if (levelId === 5 || levelId === 8 || levelId === 12 || levelId === 14) {
      // Highways
      availableObstacles = ['obstacle_jersey_barrier', 'obstacle_cone', 'obstacle_scooter_fallen'];
      availableOverheadObstacles = ['obstacle_overhead_barrier', 'obstacle_overhead_pipe'];
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
        // Decide whether this is a ground obstacle or an overhead crouch obstacle
        const isOverhead = Math.random() < 0.38;
        if (isOverhead) {
          const overheadType = Phaser.Math.RND.pick(availableOverheadObstacles);
          const obs = this.overheadObstacles.create(currentX, groundY - 74, overheadType);
          const obsBody = obs.body as Phaser.Physics.Arcade.StaticBody;
          obsBody.setSize(94, 52);
          obsBody.setOffset(23, 6);
          obs.setDepth(11);
          obs.refreshBody();
          currentX += Math.round(145 * stepScale);
        } else {
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
        }
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

  /**
   * Populates the dedicated High-Speed Racing Track Zone for the Duel with Fantomas:
   * - ZERO obstacles (no benches, fallen scooters, cones, barrels, hazards, vents).
   * - ZERO hazards (no puddles, no oil).
   * - ZERO enemies (no taxis, no pedestrians, no scooter riders).
   * - ZERO drones (no poop projectiles).
   * - Red & white racing kerbs along the track surface.
   * - Overhead LED speed arches and cheering sponsor banners.
   * - Nitro speed boost pads on the road for acceleration bursts.
   * - Continuous battery charging stations and VOLT energy arcs.
   * - Clean high-speed racing speedway!
   */
  private populateRacingTrackZone(startX: number, endX: number, groundY: number) {
    // 1. Checkpoint right before the racing track entrance
    const cp = this.checkpoints.create(startX + 40, groundY - 58, 'checkpoint_inactive');
    cp.refreshBody();

    // 2. Red & White Racing Kerbs along the entire road surface of the racing track
    for (let kx = startX - 40; kx < endX + 160; kx += 120) {
      const kerb = this.add.image(kx + 60, groundY + 33, 'track_kerb');
      kerb.setDepth(2);
    }

    // 3. Racing Track Background Safety Barriers with LED Glow
    for (let bx = startX + 50; bx < endX; bx += 160) {
      const barrier = this.add.image(bx, groundY - 14, 'track_racing_barrier');
      barrier.setDepth(3);
    }

    // 4. Overhead Racing Speed Gantries & Sponsor / Cheering Banners
    let archX = startX + 240;
    while (archX < endX - 180) {
      // Overhead LED Speed Arch
      const gantry = this.add.image(archX, groundY - 105, 'track_speed_gantry');
      gantry.setDepth(4);

      // Sponsor banner in between
      if (archX + 200 < endX - 100) {
        const banner = this.add.image(archX + 200, groundY - 115, 'track_banner');
        banner.setDepth(3);
      }

      archX += Phaser.Math.Between(440, 620);
    }

    // 5. Nitro Boost Pads (`track_boost_pad`) on the road surface
    let padX = startX + 280;
    while (padX < endX - 180) {
      const pad = this.trackBoostPads.create(padX, groundY + 28, 'track_boost_pad');
      pad.setDepth(3);
      pad.refreshBody();

      // VOLT Energy Tokens ahead of boost pad
      for (let i = 0; i < 4; i++) {
        this.voltTokens.create(padX + 65 + i * 40, groundY - 45, 'token_volt');
      }

      padX += Phaser.Math.Between(360, 520);
    }

    // 6. Charging Stations and Batteries for continuous high-speed EUC energy
    let csX = startX + 480;
    while (csX < endX - 220) {
      const cs = this.chargingStations.create(csX, groundY - 60, 'station_charger');
      cs.refreshBody();

      // Battery pickups & Lightning
      this.batteries.create(csX + 110, groundY - 45, 'item_battery');
      this.lightningPickups.create(csX + 220, groundY - 50, 'item_super_lightning');

      csX += Phaser.Math.Between(680, 920);
    }

    // 7. Kicker launch ramps on the track for super air overtakes
    let rampX = startX + 440;
    while (rampX < endX - 300) {
      const ramp = this.ramps.create(rampX, groundY - 26, 'kicker_ramp');
      ramp.refreshBody();

      // High air VOLT arc above ramp
      for (let i = 0; i < 5; i++) {
        const vx = rampX + 45 + i * 35;
        const vy = groundY - 85 - Math.sin((i / 4) * Math.PI) * 55;
        this.voltTokens.create(vx, vy, 'token_volt');
      }

      rampX += Phaser.Math.Between(640, 880);
    }
  }

  public update(time: number, delta: number) {
    if (this.isGameOver || this.isVictory) {
      soundManager.stopMotor();
      this.updateLightsAndEffects();
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

    // 3.2 BOSS FANTÔMAS ON MONOWHEEL SV DUEL TRIGGER & UPDATE
    if (
      !this.bossIntroTriggered &&
      this.player.x >= this.bossIntroTriggerX &&
      !this.isGameOver &&
      !this.isVictory &&
      !this.isCutout
    ) {
      this.triggerBossFantomasIntro();
    }
    this.updateBossDuel(time, delta);

    // 4. SUPER BOOST TIMER
    if (this.isSuperBoost) {
      this.superBoostTimer -= delta / 1000;
      if (this.superBoostTimer <= 0) {
        this.isSuperBoost = false;
        this.triggerSpeech('БУСТ ЗАВЕРШИЛСЯ');
      }
    }

    // 5. BATTERY DISCHARGE & TILTBACK LOGIC
    // EUC naturally discharges over time while riding; upgrades reduce drain rate!
    const isMoving = Math.abs(this.player.body?.velocity.x || 0) > 20;
    const baseDrain = this.isBoosting ? 14.0 : (isMoving ? 2.4 : 0.2);
    // Battery upgrade reduces discharge rate up to 66%
    const batteryEfficiency = Math.max(0.34, 1.0 - (this.upgrades?.batteryLevel || 0) * 0.22);
    const drainRate = baseDrain * batteryEfficiency;

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

    // 6.5 DYNAMIC WEATHER & SPEED-REACTIVE ATMOSPHERE
    this.updateDynamicWeather(delta);

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

    // PWM (ШИМ) calculation: EUC motor duty cycle calibrated to max limit
    const cutoutMaxSpeed = 150.0 + (this.upgrades?.controllerLevel || 0) * 5.0;
    const basePwm = (this.speedKmh / cutoutMaxSpeed) * 80;
    // Boost pushes PWM higher; continuous hold drives PWM towards 100%
    const boostPwmSurge = this.isBoosting ? 8 + (this.boostHoldDuration / (3.0 + (this.upgrades?.controllerLevel || 0) * 0.65)) * 18 : 0;
    this.currentPwm = Math.min(100, Math.max(0, Math.round(basePwm + boostPwmSurge)));
    if (this.currentPwm > this.maxPwm) {
      this.maxPwm = this.currentPwm;
    }

    // Cutout / Продав колеса при превышении максимального порога ШИМ/скорости
    if (this.speedKmh >= cutoutMaxSpeed && !this.isCutout && !this.isGameOver && !this.isVictory) {
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

    // 9. AIR & TRICK ROTATION LOGIC (REAL 360° BACKFLIPS / FRONTFLIPS ON MONOWHEEL)
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body?.blocked.down || body?.touching.down;
    if (!onGround) {
      if (!this.isAirborne) {
        // Just took off into air
        this.isAirborne = true;
        this.airStartTime = time;
        this.airStartX = this.player.x;
        this.airStartY = this.player.y;
        this.airRotationTotal = 0;
        this.airFlipProgress = 0;
        this.completedFlipsCount = 0;
        this.lastAngle = this.player.angle;
      } else {
        // Continuous real 360° flip loop rotation in air (540 degrees/sec)
        const flipRate = 540;
        let rotationDelta = 0;

        if (this.inputState.right) {
          rotationDelta = flipRate * (delta / 1000); // Frontflip (clockwise)
        } else if (this.inputState.left) {
          rotationDelta = -flipRate * (delta / 1000); // Backflip (counter-clockwise)
        }

        if (rotationDelta !== 0) {
          this.player.setAngle(this.player.angle + rotationDelta);
          this.airFlipProgress += Math.abs(rotationDelta);
          this.airRotationTotal += Math.abs(rotationDelta);

          // Full 360° flip completed in mid-air!
          if (this.airFlipProgress >= 360) {
            this.airFlipProgress -= 360;
            this.completedFlipsCount++;
            soundManager.playTrickSuccess();
            this.addComboProgress(45, 'jump');
            this.score += 1500;
            const flipName = rotationDelta > 0 ? 'ФРОНТФЛИП 360°' : 'БЭКФЛИП 360°';
            this.createFloatingText(this.player.x, this.player.y - 70, `🔄 ${flipName}! +1 500! 🔥`, '#38bdf8');
            this.triggerSpeech(`${flipName}!`);
          }
        }

        // Camera zoom out during high air jumps
        const jumpHeight = Math.max(0, this.airStartY - this.player.y);
        if (jumpHeight > 100) {
          const targetZoom = Math.max(0.82, 1.0 - (jumpHeight / 600) * 0.22);
          this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.08));
        }
      }
    } else {
      // LANDING CHECK: Transitioning from airborne to ground
      if (this.isAirborne) {
        this.isAirborne = false;
        const normAngle = Phaser.Math.Angle.WrapDegrees(this.player.angle);

        // If landed upside down (more than 90 degrees off vertical - didn't complete full flip)
        if (Math.abs(normAngle) > 90 && !this.isGameOver && !this.isVictory && !this.isCutout) {
          // Recover normally to upright stance
          this.player.setAngle(0);

          // Deduct 15% battery charge for rough landing
          const batteryPenalty = 15;
          this.battery = Math.max(5, this.battery - batteryPenalty);

          // Sound & Visual Feedback
          soundManager.playWobbleAlert();
          this.createFloatingText(this.player.x, this.player.y - 85, `⚠️ НЕ ДОКРУТИЛ САЛЬТО! -${batteryPenalty}% ЗАРЯДА! ⚡`, '#f97316');
          this.triggerSpeech('ОЙ! НЕ ДОКРУТИЛ!');

          // Small wobble recovery animation for physical feedback
          this.tweens.add({
            targets: this.player,
            angle: normAngle > 0 ? 18 : -18,
            duration: 120,
            yoyo: true,
            repeat: 1,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              if (this.player) this.player.setAngle(0);
            },
          });

          // Emit friction sparks at wheel contact
          if (this.sparkFrictionEmitter) {
            this.sparkFrictionEmitter.explode(16, this.player.x, this.player.y + 36);
          }
        } else {
          // Successful landing right-side up!
          this.player.setAngle(normAngle);
          if (this.completedFlipsCount > 0) {
            const landingBonus = 2500 * this.completedFlipsCount;
            this.score += landingBonus;
            soundManager.playTrickSuccess();
            this.createFloatingText(this.player.x, this.player.y - 85, `🎯 ИДЕАЛЬНОЕ ПРИЗЕМЛЕНИЕ! +${landingBonus}`, '#10b981');
            this.triggerSpeech('ИДЕАЛЬНОЕ ПРИЗЕМЛЕНИЕ!');
          }
        }
      }

      // On ground: smooth zoom restore (unless boost lens distortion kick is active)
      if (this.cameras.main.zoom < 1.0 && (!this.boostLensTween || !this.boostLensTween.isPlaying())) {
        this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, 1.0, 0.1));
      }
    }

    // 9. UPDATE LIGHTS & PARTICLES POSITION
    this.updateLightsAndEffects();

    // 9.5 COMBO MULTIPLIER ACCUMULATION & DECAY (Jumps, Grind, Balance)
    const isAirborneNow = !onGround;
    // Grind: riding along elevated platforms/rails (Y < 550) or low power-slide crouch at speed
    const isGrinding = onGround && (this.player.y < 550 || (this.isCrouching && this.speedKmh > 35));
    // Balance: high-speed carve (> 80 km/h), tiltback on the limit, or sustained boost (> 70 km/h)
    const isBalancing = onGround && !isGrinding && (this.speedKmh >= 80 || (this.isTiltback && this.speedKmh >= 45) || (this.isBoosting && this.speedKmh >= 70));

    if (!this.isGameOver && !this.isVictory && !this.isCutout) {
      if (isAirborneNow) {
        // Continuous air time feeds combo
        this.addComboProgress((delta / 1000) * 35, 'jump');
      } else if (isGrinding) {
        // Grinding feeds combo rapidly + emits sparks & bonus points
        this.addComboProgress((delta / 1000) * 45, 'grind');
        this.grindSparkTimer += delta / 1000;
        if (this.grindSparkTimer >= 0.08) {
          this.grindSparkTimer = 0;
          this.trailEmitter?.emitParticleAt(this.player.x, this.player.y + 44, 2);
        }
        this.grindScoreTimer += delta / 1000;
        if (this.grindScoreTimer >= 0.35) {
          this.grindScoreTimer = 0;
          const grindPts = 20 * this.combo;
          this.score += grindPts;
        }
      } else if (isBalancing) {
        // Aggressive balance feeds combo
        this.addComboProgress((delta / 1000) * 30, 'balance');
        this.grindScoreTimer += delta / 1000;
        if (this.grindScoreTimer >= 0.45) {
          this.grindScoreTimer = 0;
          const balancePts = 15 * this.combo;
          this.score += balancePts;
        }
      } else {
        // Idle / coasting passively: combo timer decays!
        this.activeTrickType = null;
        if (this.comboTimer > 0) {
          this.comboTimer -= delta / 1000;
          if (this.comboTimer <= 0) {
            if (this.combo > 1) {
              this.combo--;
              this.comboProgress = 70;
              this.comboTimer = 2.2;
              this.createFloatingText(this.player.x, this.player.y - 40, `КОМБО x${this.combo}`, '#94a3b8');
            } else {
              this.combo = 1;
              this.comboProgress = Math.max(0, this.comboProgress - (delta / 1000) * 25);
            }
          }
        } else {
          this.comboProgress = Math.max(0, this.comboProgress - (delta / 1000) * 25);
        }
      }
    } else {
      this.combo = 1;
      this.comboProgress = 0;
      this.comboTimer = 0;
      this.activeTrickType = null;
    }

    // 10. SPEECH TIMER
    if (this.speechTimer > 0) {
      this.speechTimer -= delta / 1000;
      if (this.speechTimer <= 0) {
        this.activeSpeechString = null;
        this.trickPopupString = null;
      }
    }

    // 11. UPDATE DYNAMIC WEATHER SYSTEM
    this.updateDynamicWeather(delta);

    // 12. EMIT STATS UPDATE TO REACT HUD
    this.emitStats();
  }

  private addComboProgress(amount: number, trickType: 'jump' | 'grind' | 'balance' | null) {
    if (this.isGameOver || this.isVictory || this.isCutout) return;

    if (trickType) {
      this.activeTrickType = trickType;
    }
    this.comboTimer = this.comboMaxTimer; // Reset decay countdown
    this.comboProgress += amount;

    if (this.comboProgress >= 100) {
      if (this.combo < 10) {
        this.comboProgress -= 100;
        this.combo = Math.min(10, this.combo + 1);
        soundManager.playTrickSuccess();
        const comboColor = this.combo >= 8 ? '#38bdf8' : (this.combo >= 5 ? '#f43f5e' : '#f59e0b');
        this.createFloatingText(this.player.x, this.player.y - 70, `🔥 КОМБО x${this.combo}! 🔥`, comboColor);
        if (this.combo === 5 || this.combo === 10) {
          this.triggerSpeech(`КОМБО x${this.combo}!`);
        }
      } else {
        this.comboProgress = 100;
      }
    }
  }

  // ==========================================
  // DYNAMIC WEATHER & ATMOSPHERIC PARTICLES
  // ==========================================

  private setupWeatherSystem() {
    // 1. Rain streaks emitter (depth 21, in front of world)
    this.weatherRainEmitter = this.add.particles(0, 0, 'weather_raindrop', {
      x: { min: -150, max: 550 },
      y: -35,
      quantity: 3,
      lifespan: 1100,
      speedX: { min: -140, max: -80 },
      speedY: { min: 680, max: 880 },
      scale: { start: 0.7, end: 0.45 },
      alpha: { start: 0.8, end: 0.2 },
      emitting: false,
    });
    this.weatherRainEmitter.setScrollFactor(0);
    this.weatherRainEmitter.setDepth(21);

    // 2. Snowflakes emitter (depth 21)
    this.weatherSnowEmitter = this.add.particles(0, 0, 'weather_snowflake', {
      x: { min: -150, max: 550 },
      y: -35,
      quantity: 4,
      lifespan: 2200,
      speedX: { min: -120, max: -40 },
      speedY: { min: 140, max: 280 },
      scale: { start: 0.8, end: 0.3 },
      alpha: { start: 0.9, end: 0.3 },
      emitting: false,
    });
    this.weatherSnowEmitter.setScrollFactor(0);
    this.weatherSnowEmitter.setDepth(21);

    // 3. Road surface water splash ripples
    this.weatherSplashEmitter = this.add.particles(0, 0, 'weather_rain_splash', {
      x: { min: -40, max: 490 },
      y: { min: 645, max: 670 },
      quantity: 1,
      lifespan: 320,
      scale: { start: 0.35, end: 0.8 },
      alpha: { start: 0.7, end: 0 },
      emitting: false,
    });
    this.weatherSplashEmitter.setScrollFactor(0);
    this.weatherSplashEmitter.setDepth(16);

    // 4. Tire Water / Snow Spray Emitter (world space attached to wheel)
    this.tireSprayEmitter = this.add.particles(0, 0, 'weather_rain_splash', {
      speed: { min: 40, max: 140 },
      angle: { min: 190, max: 250 },
      scale: { start: 0.5, end: 0.1 },
      lifespan: 380,
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    });
    this.tireSprayEmitter.setDepth(10);

    // 5. Atmosphere tint overlay (depth 18)
    this.weatherAtmosphereOverlay = this.add.graphics().setScrollFactor(0).setDepth(18);

    // Initialize with level default
    this.applyWeather(this.currentWeather, false);
  }

  private applyWeather(weather: WeatherType, isTransition: boolean = true) {
    const prevWeather = this.currentWeather;
    this.currentWeather = weather;

    switch (weather) {
      case 'clear':
        this.weatherRainEmitter?.stop();
        this.weatherSnowEmitter?.stop();
        this.weatherSplashEmitter?.stop();
        this.setSkyColor(0x38bdf8, isTransition);
        this.drawAtmosphereOverlay(null);
        break;

      case 'light-rain':
        this.weatherSnowEmitter?.stop();
        this.weatherRainEmitter?.setTexture('weather_raindrop');
        this.weatherRainEmitter?.setParticleTint(0xbae6fd);
        this.weatherRainEmitter?.setQuantity(3);
        this.weatherRainEmitter?.start();
        this.weatherSplashEmitter?.setQuantity(1);
        this.weatherSplashEmitter?.start();
        this.setSkyColor(0x334155, isTransition);
        this.drawAtmosphereOverlay('rain');
        break;

      case 'heavy-rain':
        this.weatherSnowEmitter?.stop();
        this.weatherRainEmitter?.setTexture('weather_raindrop');
        this.weatherRainEmitter?.setParticleTint(0x7dd3fc);
        this.weatherRainEmitter?.setQuantity(8);
        this.weatherRainEmitter?.start();
        this.weatherSplashEmitter?.setQuantity(3);
        this.weatherSplashEmitter?.start();
        this.setSkyColor(0x1e293b, isTransition);
        this.drawAtmosphereOverlay('heavy-rain');
        break;

      case 'snow':
        this.weatherRainEmitter?.stop();
        this.weatherSplashEmitter?.stop();
        this.weatherSnowEmitter?.setTexture('weather_snowflake');
        this.weatherSnowEmitter?.setParticleTint(0xffffff);
        this.weatherSnowEmitter?.setQuantity(5);
        this.weatherSnowEmitter?.start();
        this.setSkyColor(0x384559, isTransition);
        this.drawAtmosphereOverlay('snow');
        break;

      case 'blizzard':
        this.weatherRainEmitter?.stop();
        this.weatherSplashEmitter?.stop();
        this.weatherSnowEmitter?.setTexture('weather_snowflake');
        this.weatherSnowEmitter?.setParticleTint(0xe0f2fe);
        this.weatherSnowEmitter?.setQuantity(12);
        this.weatherSnowEmitter?.start();
        this.setSkyColor(0x0f172a, isTransition);
        this.drawAtmosphereOverlay('blizzard');
        break;
    }

    // Atmospheric transition effects and voice cues
    if (isTransition && prevWeather !== weather) {
      let bannerText = '';
      let bannerColor = '#38bdf8';
      let speechText: string | null = null;

      if (weather === 'light-rain') {
        bannerText = '🌧️ ПОШЁЛ СЛАБЫЙ ДОЖДЬ';
        bannerColor = '#38bdf8';
        speechText = 'ДОЖДЬ! СЦЕПЛЕНИЕ СНИЖЕНО!';
      } else if (weather === 'heavy-rain') {
        bannerText = '⛈️ ПРОЛИВНОЙ ЛИВЕНЬ! ОПАСНОСТЬ СКОЛЬЖЕНИЯ!';
        bannerColor = '#0284c7';
        speechText = 'ЛИВЕНЬ! СЕМА, ДЕРЖИ РАВНОВЕСИЕ!';
      } else if (weather === 'snow') {
        bannerText = '❄️ ПОШЁЛ СНЕГОПАД! ГОЛОЛЁД НА ДОРОГЕ!';
        bannerColor = '#38bdf8';
        speechText = 'СНЕГ! ОСТОРОЖНО, ГОЛОЛЁД!';
      } else if (weather === 'blizzard') {
        bannerText = '🌬️ СНЕЖНЫЙ БУРАН И МЕТЕЛЬ! ВЕТЕР И ЛЁД!';
        bannerColor = '#818cf8';
        speechText = 'МЕТЕЛЬ! ДЕРЖИСЬ КРЕПЧЕ!';
      } else {
        bannerText = '☀️ РАСПОГОДИЛОСЬ: ЯСНО';
        bannerColor = '#facc15';
        speechText = 'РАСПОГОДИЛОСЬ!';
      }

      if (bannerText && this.player) {
        this.createFloatingText(this.player.x, this.player.y - 75, bannerText, bannerColor);
      }
      if (speechText) {
        this.triggerSpeech(speechText);
      }
    }
  }

  private setSkyColor(targetColor: number, isTransition: boolean) {
    if (!this.skyLayer) return;
    if (!isTransition) {
      this.skyLayer.setFillStyle(targetColor);
      return;
    }
    const currentColor = this.skyLayer.fillColor;
    const fromR = (currentColor >> 16) & 0xff;
    const fromG = (currentColor >> 8) & 0xff;
    const fromB = currentColor & 0xff;

    const toR = (targetColor >> 16) & 0xff;
    const toG = (targetColor >> 8) & 0xff;
    const toB = targetColor & 0xff;

    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 1600,
      onUpdate: (tween) => {
        const val = (tween.getValue() as number) / 100;
        const r = Math.round(fromR + (toR - fromR) * val);
        const g = Math.round(fromG + (toG - fromG) * val);
        const b = Math.round(fromB + (toB - fromB) * val);
        const col = (r << 16) | (g << 8) | b;
        this.skyLayer.setFillStyle(col);
      },
    });
  }

  private drawAtmosphereOverlay(type: string | null) {
    if (!this.weatherAtmosphereOverlay) return;
    this.weatherAtmosphereOverlay.clear();
    if (!type) return;

    if (type === 'rain') {
      this.weatherAtmosphereOverlay.fillStyle(0x0f172a, 0.08);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 450, 800);
    } else if (type === 'heavy-rain') {
      this.weatherAtmosphereOverlay.fillStyle(0x0284c7, 0.12);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 450, 800);
      this.weatherAtmosphereOverlay.fillStyle(0x090d16, 0.35);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 450, 140);
    } else if (type === 'snow') {
      this.weatherAtmosphereOverlay.fillStyle(0xe0f2fe, 0.06);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 450, 800);
    } else if (type === 'blizzard') {
      this.weatherAtmosphereOverlay.fillStyle(0x38bdf8, 0.12);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 450, 800);

      this.weatherAtmosphereOverlay.fillStyle(0xe0f2fe, 0.25);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 20, 800);
      this.weatherAtmosphereOverlay.fillRect(430, 0, 20, 800);
      this.weatherAtmosphereOverlay.fillRect(0, 0, 450, 18);
      this.weatherAtmosphereOverlay.fillRect(0, 782, 450, 18);
    }
  }

  private updateDynamicWeather(_delta: number) {
    const progress = Phaser.Math.Clamp(this.distance / Math.max(1, this.levelConfig.length), 0, 1);
    let targetWeather: WeatherType = this.levelConfig.weather;

    switch (this.levelConfig.id) {
      case 2:
        targetWeather = progress >= 0.35 && progress <= 0.70 ? 'light-rain' : 'clear';
        break;
      case 6:
        targetWeather = progress <= 0.85 ? 'heavy-rain' : 'light-rain';
        break;
      case 11:
        targetWeather = progress >= 0.25 && progress <= 0.85 ? 'blizzard' : 'snow';
        break;
      default:
        targetWeather = this.levelConfig.weather;
        break;
    }

    if (targetWeather !== this.currentWeather) {
      this.applyWeather(targetWeather, true);
    }

    // Speed-reactive rain particles
    const vx = this.player.body?.velocity.x || 0;
    if (this.weatherRainEmitter && this.weatherRainEmitter.emitting) {
      const slantX = Phaser.Math.Clamp(-120 - Math.abs(vx) * 0.35, -550, -80);
      const speedY = Phaser.Math.Clamp(750 + Math.abs(vx) * 0.25, 650, 1100);
      this.weatherRainEmitter.setParticleSpeed(slantX, speedY);
    }

    // Speed-reactive snow particles
    if (this.weatherSnowEmitter && this.weatherSnowEmitter.emitting) {
      const isBlizzard = this.currentWeather === 'blizzard';
      const slantX = Phaser.Math.Clamp((isBlizzard ? -260 : -80) - Math.abs(vx) * 0.25, -600, -40);
      const speedY = isBlizzard ? Phaser.Math.Clamp(280 + Math.abs(vx) * 0.15, 200, 450) : Phaser.Math.Between(120, 240);
      this.weatherSnowEmitter.setParticleSpeed(slantX, speedY);
    }

    // Tire spray emitter
    if (this.tireSprayEmitter) {
      const isWet = this.currentWeather === 'light-rain' || this.currentWeather === 'heavy-rain';
      const isSnowy = this.currentWeather === 'snow' || this.currentWeather === 'blizzard';
      const speed = Math.abs(vx);
      const onGround = this.player.body?.blocked.down || this.player.body?.touching.down;

      if ((isWet || isSnowy) && speed > 80 && onGround) {
        this.tireSprayEmitter.setTexture(isWet ? 'weather_rain_splash' : 'weather_snow_spray');
        this.tireSprayEmitter.setPosition(this.player.x - 22, this.player.y + 42);
        this.tireSprayEmitter.start();
      } else {
        this.tireSprayEmitter.stop();
      }
    }
  }

  // ==========================================
  // HIGH-ENERGY SPARK PARTICLE SYSTEM
  // ==========================================

  private setupSparkParticleSystem() {
    // 1. Explosive radial impact sparks (for collisions with obstacles, drones, cars)
    this.sparkImpactEmitter = this.add.particles(0, 0, 'spark_point_orange', {
      speed: { min: 160, max: 490 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.3, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 220, max: 480 },
      gravityY: 520,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparkImpactEmitter.setDepth(24);

    // 2. High-speed grinding friction sparks (for falls, wipes, pedal scrapes on asphalt)
    this.sparkFrictionEmitter = this.add.particles(0, 0, 'spark_streak', {
      speed: { min: 220, max: 620 },
      angle: { min: 185, max: 245 },
      scale: { start: 1.4, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 650 },
      gravityY: 560,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparkFrictionEmitter.setDepth(24);

    // 3. High-Voltage VOLT Energy Discharge Sparks (for collecting energy, batteries, stations)
    this.sparkVoltEmitter = this.add.particles(0, 0, 'spark_point_gold', {
      speed: { min: 120, max: 420 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 380, max: 720 },
      gravityY: -70, // electric plasma drifts upward
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparkVoltEmitter.setDepth(25);
  }

  /**
   * Spawns radiant sparks and shockwaves when colliding with obstacles, cars, drones, or projectiles
   */
  public emitCollisionSparks(x: number, y: number, colorPreset: 'orange' | 'gold' | 'cyan' | 'mixed' = 'mixed') {
    if (!this.sparkImpactEmitter) return;

    // Pick spark texture
    const texture =
      colorPreset === 'cyan'
        ? 'spark_point_cyan'
        : colorPreset === 'gold'
        ? 'spark_point_gold'
        : colorPreset === 'orange'
        ? 'spark_point_orange'
        : Phaser.Math.RND.pick(['spark_point_gold', 'spark_point_orange', 'spark_point_white']);

    this.sparkImpactEmitter.setTexture(texture);
    this.sparkImpactEmitter.explode(30, x, y);

    // Also emit flying friction streaks
    if (this.sparkFrictionEmitter) {
      this.sparkFrictionEmitter.explode(12, x, y);
    }

    // Expanding shockwave ring at point of impact
    const ring = this.add.image(x, y, 'spark_ring');
    ring.setDepth(23);
    ring.setScale(0.3);
    ring.setAlpha(0.9);
    this.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Spawns intense cascading friction sparks when falling, cutting out, or wiping out along the road
   */
  public emitFallSparks(x: number, y: number, vx: number = 0) {
    if (!this.sparkFrictionEmitter || !this.sparkImpactEmitter) return;

    // Spray asphalt grinding sparks
    this.sparkFrictionEmitter.setTexture('spark_streak');
    this.sparkFrictionEmitter.explode(45, x, y);

    // Hot incandescent metal chunks
    this.sparkImpactEmitter.setTexture('spark_point_orange');
    this.sparkImpactEmitter.explode(28, x, y);

    // Shockwave ring
    const ring = this.add.image(x, y, 'spark_ring');
    ring.setDepth(23);
    ring.setTint(0xf97316);
    ring.setScale(0.4);
    this.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Staggered secondary scrape burst for realistic asphalt sliding simulation
    const driftX = vx >= 0 ? -30 : 30;
    this.time.delayedCall(120, () => {
      if (this.sparkFrictionEmitter) {
        this.sparkFrictionEmitter.explode(25, x + driftX, y);
      }
    });
  }

  /**
   * Emits bright tire/road friction sparks and metal embers
   */
  public emitFrictionSparks(x: number, y: number, count: number = 30) {
    if (this.sparkFrictionEmitter) {
      this.sparkFrictionEmitter.explode(count, x, y);
    }
    if (this.sparkImpactEmitter) {
      this.sparkImpactEmitter.explode(Math.floor(count / 2), x, y);
    }
  }

  /**
   * Spawns brilliant electrical spark arcs and golden starbursts when collecting VOLT energy
   */
  public emitVoltEnergySparks(x: number, y: number, isMega: boolean = false) {
    if (!this.sparkVoltEmitter) return;

    const count = isMega ? 50 : 24;

    // Golden high-voltage spark explosion
    this.sparkVoltEmitter.setTexture('spark_point_gold');
    this.sparkVoltEmitter.explode(count, x, y);

    // Cyan plasma electric arc sparks for high-energy burst
    if (isMega && this.sparkImpactEmitter) {
      this.sparkImpactEmitter.setTexture('spark_point_cyan');
      this.sparkImpactEmitter.explode(28, x, y);
    }

    // White core flash
    const flash = this.add.image(x, y, 'spark_point_white');
    flash.setDepth(26);
    flash.setScale(isMega ? 3.5 : 1.8);
    this.tweens.add({
      targets: flash,
      scale: isMega ? 5.2 : 2.6,
      alpha: 0,
      duration: isMega ? 320 : 180,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    // Expanding golden energy shockwave ring
    const ring = this.add.image(x, y, 'spark_ring');
    ring.setDepth(25);
    ring.setTint(isMega ? 0x38bdf8 : 0xfacc15);
    ring.setScale(0.3);
    this.tweens.add({
      targets: ring,
      scale: isMega ? 4.0 : 2.2,
      alpha: 0,
      duration: isMega ? 420 : 260,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
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
      comboProgress: Math.min(100, Math.max(0, Math.round(this.comboProgress))),
      comboTimer: Math.max(0, Math.round(this.comboTimer * 10) / 10),
      comboMaxTimer: this.comboMaxTimer,
      activeTrickType: this.activeTrickType,
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
      weather: this.currentWeather,
      activeSpeech: this.activeSpeechString,
      trickPopup: this.trickPopupString,
      currentLevel: this.levelConfig.id,
      levelName: this.levelConfig.name,
      levelLength: this.levelConfig.length,
      bossDuelActive: this.bossDuelActive,
      bossName: 'ФАНТОМАС (SV)',
      bossDistanceLead: this.bossDistanceLead,
      bossStunned: this.bossStunned,
      bossSlipstreamActive: this.bossSlipstreamActive,
      bossSlipstreamCharge: Math.round(this.bossSlipstreamCharge),
    });
  }

  private handleMovement(delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body?.blocked.down || body?.touching.down;

    // 🛑 BOSS DUEL INTRO, COUNTDOWN, VICTORY OR GAMEOVER: Prevent movement or texture override
    if (this.bossDuelIntroPlaying || this.isVictory || this.isGameOver) {
      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);
      this.isBoosting = false;
      this.boostHoldDuration = 0;
      this.jumpBufferTimer = 0;
      this.jumpTriggered = false;
      soundManager.updateMotorSpeed(0, false);
      soundManager.stopMotor();
      soundManager.updateTurbine(false, 0, false);
      soundManager.stopTurbine();
      return;
    }

    // Determine speed bounds based on level configuration:
    // Progressive speed from Level 1 (~44 km/h) up to Level 15 (~85 km/h cruising, ~146 km/h boost, ~150 km/h top limit)
    let maxSpeed: number;
    let accel: number;

    if ((this.isTiltback || this.battery <= 0) && !this.isSuperBoost) {
      // Pedal lift / Tiltback: EUC protects itself and forces speed throttling ("еле едет задрав педали")
      if (this.battery <= 0) {
        maxSpeed = 38; // ~5.5 km/h (barely rolling crawl when completely out of battery)
      } else if (this.battery <= 5) {
        maxSpeed = 48; // ~7 km/h (barely rolling)
      } else if (this.battery <= 15) {
        maxSpeed = 82; // ~12 km/h (slow limp)
      } else {
        maxSpeed = 125; // ~18 km/h (reduced speed)
      }
      accel = onGround ? 180 : 110;
    } else {
      const controllerSpeedBonus = (this.upgrades?.controllerLevel || 0) * 35;
      const controllerAccelBonus = (this.upgrades?.controllerLevel || 0) * 60;
      const baseSpeed = (this.levelConfig.baseSpeed || 300) + (this.upgrades?.controllerLevel || 0) * 15;
      const normalBoost = (this.levelConfig.boostSpeed || 680) + controllerSpeedBonus;
      const boostSpeed = this.isSuperBoost ? Math.min(1120, normalBoost + 60) : normalBoost;
      maxSpeed = this.isBoosting ? boostSpeed : baseSpeed;
      accel = onGround
        ? Math.round(880 + this.levelConfig.id * 20 + controllerAccelBonus)
        : Math.round(460 + this.levelConfig.id * 12 + controllerAccelBonus * 0.5);
    }

    // Calculate Traction Factor based on Weather and Hydro Protection Upgrade
    const hydroLvl = this.upgrades?.hydroLevel || 0;
    const hydroMitigation = Math.min(0.85, hydroLvl * 0.28);

    let weatherGripLoss = 0;
    switch (this.currentWeather) {
      case 'light-rain':
        weatherGripLoss = 0.15;
        break;
      case 'heavy-rain':
        weatherGripLoss = 0.30;
        break;
      case 'snow':
        weatherGripLoss = 0.40;
        break;
      case 'blizzard':
        weatherGripLoss = 0.50;
        break;
      case 'clear':
      default:
        weatherGripLoss = 0;
        break;
    }

    const netGripLoss = weatherGripLoss * (1.0 - hydroMitigation);
    const tractionFactor = 1.0 - netGripLoss;

    accel = Math.round(accel * tractionFactor);
    const drag = onGround ? Math.round((780 + this.levelConfig.id * 10) * tractionFactor) : 250;
    body.setDragX(drag);

    // Slippage warning when accelerating / boosting on slippery road
    if (this.slipWarningCooldown > 0) {
      this.slipWarningCooldown -= delta / 1000;
    }
    const currentSpeedVal = Math.abs(body.velocity.x);
    if (
      netGripLoss >= 0.22 &&
      onGround &&
      (this.inputState.left || this.inputState.right || this.isBoosting) &&
      currentSpeedVal > 220 &&
      this.slipWarningCooldown <= 0
    ) {
      this.slipWarningCooldown = 4.0;
      soundManager.playWobbleAlert();
      const warningMsg = (this.currentWeather === 'snow' || this.currentWeather === 'blizzard')
        ? '❄️ ГОЛОЛЁД! ЗАНОС МОНОКОЛЕСА!'
        : '⚠️ МОКРЫЙ АСФАЛЬТ! СКОЛЬЖЕНИЕ!';
      const warningColor = (this.currentWeather === 'snow' || this.currentWeather === 'blizzard')
        ? '#38bdf8'
        : '#f59e0b';
      this.createFloatingText(this.player.x, this.player.y - 65, warningMsg, warningColor);
    }

    // Boost activation with 3-second cutout limit (Blocked when battery is 0!)
    if (this.inputState.boost && this.battery > 0) {
      if ((this.isTiltback || this.battery <= 0) && !this.isSuperBoost) {
        this.isBoosting = false;
        this.boostHoldDuration = 0;
        // Boost disabled while pedals are lifted or no energy
      } else {
        if (!this.isBoosting) {
          this.isBoosting = true;
          soundManager.playBoost(this.isSuperBoost);
          this.triggerSpeech(RU.phrases[1]); // «ПОШЁЛ БУСТ!»
          this.triggerBoostDistortion(this.isSuperBoost);
        }

        // Accumulate continuous boost hold duration
        this.boostHoldDuration += delta / 1000;

        // Dynamic cutout threshold based on Controller Upgrade (3.0s -> 5.0s)
        const boostCutoutThreshold = 3.0 + this.upgrades.controllerLevel * 0.65;
        const warningStartThreshold = boostCutoutThreshold - 1.5;

        // Warning sound & alert when approaching cutout threshold
        if (this.boostHoldDuration >= warningStartThreshold && this.boostHoldDuration < boostCutoutThreshold) {
          this.boostWarningTimer -= delta / 1000;
          if (this.boostWarningTimer <= 0) {
            soundManager.playBoostWarning(this.boostHoldDuration);
            if (this.boostHoldDuration >= boostCutoutThreshold - 0.7) {
              this.triggerSpeech('ПЕРЕГРЕВ! ОТПУСТИ БУСТ!');
              this.cameras.main.shake(70, 0.005);
            }
            // Warning beep frequency accelerates as threshold approaches
            this.boostWarningTimer = Math.max(0.10, 0.42 - (this.boostHoldDuration - warningStartThreshold) * 0.22);
          }
        }

        // CRITICAL CUTOUT: Boost held for longer than controller threshold!
        if (this.boostHoldDuration >= boostCutoutThreshold && !this.isCutout && !this.isGameOver && !this.isVictory) {
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
        this.player.setOffset(116, 193);
      }
    } else {
      if (this.isCrouching) {
        this.isCrouching = false;
        // Standard compact upright hitbox (height 120px)
        this.player.setSize(48, 120);
        this.player.setOffset(116, 138);
      }
    }

    // Horizontal acceleration & texture selection
    if (this.inputState.right) {
      body.setAccelerationX(accel);
      if (body.velocity.x > maxSpeed) body.setVelocityX(maxSpeed);
      this.player.setFlipX(false);
      if (onGround && !this.isWobbling) {
        if (this.isCrouching) {
          this.player.setTexture('sema_crouch');
        } else if (this.isTiltback) {
          this.player.setTexture('sema_tiltback');
        } else {
          this.player.setTexture(this.isBoosting ? (this.isSuperBoost ? 'sema_super_boost' : 'sema_boost') : 'sema_lean_fwd');
        }
      }
    } else if (this.inputState.left) {
      body.setAccelerationX(-accel);
      if (body.velocity.x < -maxSpeed) body.setVelocityX(-maxSpeed);
      this.player.setFlipX(true);
      if (onGround && !this.isWobbling) {
        if (this.isCrouching) {
          this.player.setTexture('sema_crouch');
        } else if (this.isTiltback) {
          this.player.setTexture('sema_tiltback');
        } else {
          this.player.setTexture(this.isBoosting ? (this.isSuperBoost ? 'sema_super_boost' : 'sema_boost') : 'sema_lean_fwd');
        }
      }
    } else {
      body.setAccelerationX(0);
      if (onGround && !this.isWobbling) {
        if (this.isCrouching) {
          this.player.setTexture('sema_crouch');
        } else if (this.isTiltback) {
          this.player.setTexture('sema_tiltback');
        } else if (this.isBoosting) {
          this.player.setTexture(this.isSuperBoost ? 'sema_super_boost' : 'sema_boost');
        } else if (Math.abs(body.velocity.x) > 30) {
          // Braking / coasting lean
          this.player.setTexture('sema_lean_back');
        } else {
          this.player.setTexture('sema_normal');
        }
      }
    }

    // Synchronized real EUC tilt physics:
    // Sema, the pedals, and the monowheel tilt together in a 1:1 proportional relationship!
    const isFlip = this.player.flipX;
    let targetAngle = 0;

    if (!this.isWobbling && !this.isGameOver && !this.isVictory) {
      if (this.isTiltback) {
        // EUC safety tiltback leans back sharply
        targetAngle = isFlip ? 16 : -16;
      } else if (this.isBoosting) {
        // Horizontal aerodynamic boost lean: torso leans horizontal to the ground!
        const boostAngle = this.isSuperBoost ? 74 : 64;
        targetAngle = isFlip ? -boostAngle : boostAngle;
      } else if (this.inputState.right) {
        targetAngle = 10;
      } else if (this.inputState.left) {
        targetAngle = -10;
      } else if (onGround && Math.abs(body.velocity.x) > 40) {
        // Braking / coasting back lean
        targetAngle = isFlip ? 6 : -6;
      }
    }

    // Smoothly interpolate angle around wheel axle center (ON GROUND ONLY so air flips rotate freely)
    if (onGround) {
      const currAngle = this.player.angle;
      const lerpedAngle = Phaser.Math.Linear(currAngle, targetAngle, 0.22);
      this.player.setAngle(lerpedAngle);
    }

    // In air posture
    if (!onGround && !this.isWobbling && !this.isInvulnerable) {
      if (this.isTiltback) {
        this.player.setTexture('sema_tiltback');
      } else if (this.isBoosting) {
        this.player.setTexture(this.isSuperBoost ? 'sema_super_boost' : 'sema_boost');
      }
    }

    // Fast fall in air
    if (this.inputState.down && !onGround) {
      body.setVelocityY(Math.max(body.velocity.y, 480)); // fast descent
    }

    // ⚡ INSTANT JUMP EXECUTION: Leaps immediately when jump button is pressed
    // Disabled when battery is 0! ("когда моноколесо разряжено оно не должно прыгать по кнопке прыжок")
    if (this.inputState.jump) {
      if (!this.jumpTriggered) {
        this.jumpTriggered = true;
        if (this.battery <= 0 && !this.isSuperBoost) {
          // No electrical charge: unicycle cannot jump!
          this.jumpBufferTimer = 0;
          soundManager.playTiltbackAlarm();
          this.createFloatingText(this.player.x, this.player.y - 60, '⚡ НЕТ ЗАРЯДА ДЛЯ ПРЫЖКА!', '#ef4444');
        } else {
          this.jumpBufferTimer = 0.16; // 160ms jump buffer in case slightly airborne
          if (onGround && !this.isGameOver && !this.isVictory && !this.isCutout) {
            const speedRatio = Math.abs(body.velocity.x) / Math.max(1, maxSpeed);
            const jumpImpulse = -630 - speedRatio * 110;
            this.executeJump(jumpImpulse);
            this.jumpBufferTimer = 0;
          }
        }
      }
    } else {
      this.jumpTriggered = false;
    }

    // Process buffered jump if player touched ground while buffer was active
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta / 1000;
      if (this.battery > 0 || this.isSuperBoost) {
        if (onGround && !this.isGameOver && !this.isVictory && !this.isCutout) {
          const speedRatio = Math.abs(body.velocity.x) / Math.max(1, maxSpeed);
          const jumpImpulse = -630 - speedRatio * 110;
          this.executeJump(jumpImpulse);
          this.jumpBufferTimer = 0;
        }
      } else {
        this.jumpBufferTimer = 0;
      }
    }

    // Dynamic motor sound pitch tracking - active ONLY while wheel is rolling!
    const currentSpeed = Math.abs(body.velocity.x);
    const currentSpeedRatio = Math.min(1, currentSpeed / maxSpeed);
    if (!this.isVictory && !this.isGameOver && currentSpeed > 15) {
      soundManager.updateMotorSpeed(currentSpeedRatio, this.isBoosting);
    } else {
      soundManager.updateMotorSpeed(0, false);
    }

    // Dynamic EUC unicycle turbine sound: spools up in pitch when holding boost, smoothly winds down on release!
    if (!this.isVictory && !this.isGameOver && !this.isCutout && this.isBoosting) {
      soundManager.updateTurbine(true, this.boostHoldDuration, this.isSuperBoost);
    } else {
      soundManager.updateTurbine(false, 0, false);
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
        let progressReward = 35;
        if (trickName === RU.trickMiniFlip) progressReward = 60;
        else if (trickName === RU.trickHighDrop) progressReward = 50;
        else if (trickName === RU.trickLongJump) progressReward = 45;
        this.addComboProgress(progressReward, 'jump');

        const earned = trickScore * this.combo;
        this.score += earned;
        this.triggerTrick(trickName, this.combo);
        soundManager.playTrickSuccess();

        // 🔋 Battery Level 3: Quantum Solid-State regenerative braking & trick energy generation
        if ((this.upgrades?.batteryLevel || 0) >= 3) {
          const prevBatt = this.battery;
          this.battery = Math.min(100, this.battery + 8);
          if (this.battery > prevBatt) {
            this.createFloatingText(this.player.x, this.player.y - 65, '🔋 РЕГЕНЕРАЦИЯ +8%', '#34d399');
          }
        }
      } else {
        // Safe standard landing keeps current combo active, adding minor progress
        this.addComboProgress(10, 'jump');
      }

      // Reset angle to upright
      this.tweens.add({
        targets: this.player,
        angle: 0,
        duration: 120,
        ease: 'Cubic.easeOut',
      });
    } else {
      // Clumsy landing: stumble breaks combo, pedal scrapes ground with sparks
      this.combo = 1;
      this.comboProgress = 0;
      this.comboTimer = 0;
      this.activeTrickType = null;
      this.triggerSpeech('НУ ПОЧТИ...');
      this.emitCollisionSparks(this.player.x, this.player.y + 40, 'orange');
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
      this.addComboProgress(30, 'jump');
      soundManager.playJump();
      this.triggerSpeech(RU.rampJump); // «ПОЛЕТЕЛ!»
      this.createFloatingText(this.player.x, this.player.y - 60, '🚀 ТРАМПЛИН! +30', '#38bdf8');
    }
  }

  private handleCollectVolt(playerObj: any, voltObj: any) {
    voltObj.destroy();
    this.voltsCollected++;
    this.score += 100 * this.combo;
    if (this.onCollectVoltCallback) {
      this.onCollectVoltCallback();
    }
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
    this.triggerBoostDistortion(true);
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

  private handleBoostPadOverlap(playerObj: any, padObj: any) {
    const pad = padObj as Phaser.Physics.Arcade.Sprite;
    if (!pad || !pad.active) return;
    const lastBoosted = pad.getData('lastBoosted') || 0;
    const now = this.time.now;
    if (now - lastBoosted < 600) return;
    pad.setData('lastBoosted', now);

    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (pBody) {
      pBody.setVelocityX(Math.max(pBody.velocity.x + 350, 920));
    }

    soundManager.playSuperBoost();
    this.emitVoltEnergySparks(pad.x, pad.y - 10, true);
    this.createFloatingText(pad.x, pad.y - 45, '⚡ NITRO ТРЕК-УСКОРИТЕЛЬ! ⚡', '#00f0ff');
    this.score += 250;

    // Pad bounce animation
    this.tweens.add({
      targets: pad,
      scaleY: 1.35,
      yoyo: true,
      duration: 110,
    });
  }

  private handleHitOverheadObstacle(playerObj: any, obsObj: any) {
    if (this.isInvulnerable || this.isGameOver || this.isVictory) return;
    if (!obsObj || obsObj.active === false) return;

    const p = this.player;

    if (this.isCrouching) {
      // ⬇️ ИГРОК ПРИСЕЛ: УСПЕШНЫЙ ПРОЛЁТ ПОД ПРЕПЯТСТВИЕМ! ⬇️
      if (!obsObj.getData('duckedPassed')) {
        obsObj.setData('duckedPassed', true);

        soundManager.playSmileBonus();
        this.addComboProgress(35, 'grind');
        const bonusPoints = 200 * this.combo;
        this.score += bonusPoints;
        this.tricksCount++;

        this.createFloatingText(p.x, p.y - 65, `⬇️ ПРИСЕД! ПРОСКОЧИЛ! +${bonusPoints}`, '#38bdf8');
        this.triggerSpeech(Phaser.Math.RND.pick([
          'ХУХ, ПРОЛЕЗ В ПРИСЕДЕ!',
          'ПРИСЕЛ — И ПРОЛЕТЕЛ!',
          'ЧУТЬ ШЛЕМ НЕ СНЕСЛО!',
          'НАТУРАЛЬНЫЙ ПРИСЕД!'
        ]));

        if (this.trailEmitter) {
          this.trailEmitter.emitParticleAt(p.x, p.y + 20, 6);
        }
      }
      return;
    }

    // Игрок ехал стоя или подпрыгнул прямо в шлагбаум/трубу: СТОЛКНОВЕНИЕ ГОЛОВОЙ!
    this.createFloatingText(p.x, p.y - 75, '💥 НАДО БЫЛО ПРИСЕСТЬ! ⬇️', '#ef4444');
    this.triggerSpeech('ОЙ, ГОЛОВА!');
    this.handleHitObstacle(playerObj, obsObj);
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
      this.addComboProgress(45, 'jump');
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
    this.comboProgress = 0;
    this.comboTimer = 0;
    this.activeTrickType = null;

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
      this.addComboProgress(50, 'jump');
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

    // Obstacle damage: shields loss AND complete battery drain to 0%!
    this.shields--;
    this.battery = 0; // Complete electricity depletion on poop hit
    this.isTiltback = true;
    this.isBoosting = false;
    this.isSuperBoost = false;
    this.boostHoldDuration = 0;
    this.tiltbackBeepTimer = 0;
    this.tiltbackSpeechTimer = 0;
    soundManager.playHit();
    soundManager.playPoopSplatSound();
    soundManager.playTiltbackAlarm();
    this.cameras.main.shake(220, 0.022);

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
    this.createFloatingText(p.x, p.y - 70, `💩 ${RU.hitPoopAlert || 'КАКАШКА С ДРОНА!'} ЗАРЯД 0%! -1 ЩИТ`, '#854d0e');
    this.triggerSpeech('ЗАРЯД В НУЛЬ! ИЩИ ЗАРЯДКУ!');

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
    this.comboProgress = 0;
    this.comboTimer = 0;
    this.activeTrickType = null;

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
    const hydro = this.upgrades?.hydroLevel || 0;
    
    // IP68 Hydro Level 3: 100% immunity to puddles + turbo-traction on wet asphalt!
    if (hydro >= 3) {
      const now = this.time.now;
      const lastHydroBoost = this.player.getData('lastHydroBoost') || 0;
      if (now - lastHydroBoost > 1200) {
        this.player.setData('lastHydroBoost', now);
        body.setVelocityX(body.velocity.x * 1.15);
        this.createFloatingText(this.player.x, this.player.y - 50, '⚡ IP68 НАНО-СЦЕПЛЕНИЕ! +15%', '#38bdf8');
      }
      return;
    }

    // Puddle causes slight loss of traction (mitigated by Hydro levels 1 and 2)
    const slipFactor = hydro === 2 ? 0.92 : hydro === 1 ? 0.82 : 0.70;
    body.setVelocityX(body.velocity.x * slipFactor);
    this.player.setAngle(this.player.flipX ? 10 : -10);
    soundManager.playPuddleSlip();
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
    soundManager.stopTurbine();
    this.clearBoostDistortion();
    this.clearJumpTrajectory();
    this.isJumpHolding = false;
    this.jumpHoldTimer = 0;

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
    this.isJumpHolding = false;
    this.jumpHoldTimer = 0;
    this.combo = 1;
    this.comboProgress = 0;
    this.comboTimer = 0;
    this.activeTrickType = null;
    this.fallsCount++;
    soundManager.stopMotor();
    soundManager.stopTurbine();
    this.clearBoostDistortion();
    this.clearJumpTrajectory();
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

    // 1. Sema falls down directly on the ground surface ("Сёма на земле")
    const groundY = 648;
    this.player.setY(groundY - 32);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);
      body.setAllowGravity(false);
    }
    this.player.setAngle(this.player.flipX ? 75 : -75);

    // 2. Neon Skeleton Strobe / Blinking Effect ("моргая как скелет")
    const skeletonTextures = ['sema_skeleton_cyan', 'sema_skeleton_magenta', 'sema_skeleton_green', 'sema_fall'];
    let skelIdx = 0;
    this.skeletonTimer = this.time.addEvent({
      delay: 85,
      loop: true,
      callback: () => {
        if (!this.player || !this.player.active) return;
        skelIdx = (skelIdx + 1) % skeletonTextures.length;
        this.player.setTexture(skeletonTextures[skelIdx]);
      },
    });

    // 3. Crying animation with tear streams dripping down & crying emojis ("и плакал")
    const headX = this.player.x + (this.player.flipX ? 18 : -18);
    const headY = this.player.y - 12;

    // Tear droplets flowing down onto asphalt
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 120, () => {
        if (!this.player || !this.player.active) return;

        // Animated tear drop
        const tear = this.add.circle(
          headX + Phaser.Math.Between(-8, 8),
          headY + Phaser.Math.Between(-4, 4),
          Phaser.Math.Between(3, 5),
          0x38bdf8,
          0.9
        );
        tear.setDepth(17);

        this.tweens.add({
          targets: tear,
          y: headY + Phaser.Math.Between(25, 45),
          x: tear.x + Phaser.Math.Between(-12, 12),
          scale: 1.8,
          alpha: 0,
          duration: 480,
          ease: 'Quad.easeIn',
          onComplete: () => tear.destroy(),
        });

        // Tear splash / puddle on ground
        const puddle = this.add.ellipse(headX, headY + 38, 14, 5, 0x0284c7, 0.75);
        puddle.setDepth(14);
        this.tweens.add({
          targets: puddle,
          scaleX: 2.2,
          scaleY: 2.2,
          alpha: 0,
          duration: 650,
          onComplete: () => puddle.destroy(),
        });
      });
    }

    // Floating crying emojis
    const cryEmojis = ['😭', '💧', '😢', '😭'];
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 220, () => {
        if (!this.player || !this.player.active) return;
        const emoji = cryEmojis[i % cryEmojis.length];
        const emText = this.add.text(
          this.player.x + Phaser.Math.Between(-24, 24),
          this.player.y - 28,
          emoji,
          { fontSize: '24px' }
        ).setOrigin(0.5).setDepth(18);

        this.tweens.add({
          targets: emText,
          y: emText.y - Phaser.Math.Between(45, 80),
          x: emText.x + Phaser.Math.Between(-20, 20),
          alpha: 0,
          scale: 1.5,
          duration: 900,
          ease: 'Back.easeOut',
          onComplete: () => emText.destroy(),
        });
      });
    }

    // 4. Floating text & Crying Speech (NO SKELETON PHRASES!)
    this.createFloatingText(this.player.x, this.player.y - 75, '😭 СЁМА УПАЛ И ПЛАЧЕТ! 😭', '#f43f5e');

    const cryingSpeech = Phaser.Math.RND.pick([
      '😭 ХНЫК-ХНЫК! УПАЛ НА АСФАЛЬТ!',
      '😢 ОЙ-ЁЙ-ЁЙ, МОЁ КОЛЕСО!',
      '😭 ХНЫК-ХНЫК! БАТАРЕЯ В НУЛЬ!',
      '💧 ПРИЛЁГ ОТДОХНУТЬ! 😢'
    ]);
    this.triggerSpeech(cryingSpeech);

    // 5. Impact shockwave aura on asphalt
    const shockwave = this.add.circle(this.player.x, groundY - 10, 20, 0xf43f5e, 0.85);
    shockwave.setDepth(16);
    this.tweens.add({
      targets: shockwave,
      scale: 4.2,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => shockwave.destroy(),
    });

    // 6. Give player 1800ms to see the crying skeleton animation on ground before pausing game and showing respawn popup
    this.gameOverTimer = this.time.delayedCall(1800, () => {
      this.gameOverTimer = null;
      if (this.physics?.world) {
        this.physics.pause();
      }
      this.pauseGame();
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
    this.boostHoldDuration = 0;
    this.isJumpHolding = false;
    this.jumpHoldTimer = 0;
    this.combo = 1;
    this.comboProgress = 0;
    this.comboTimer = 0;
    this.activeTrickType = null;
    soundManager.stopTurbine();
    this.clearBoostDistortion();
    this.clearJumpTrajectory();
    if (this.cameras?.main) {
      this.cameras.main.setZoom(1.0);
    }
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
    this.bossDistanceLead = 0;

    // Reset Boss Duel state if respawned before the boss encounter trigger
    if (this.lastCheckpointX < this.bossIntroTriggerX) {
      this.bossIntroTriggered = false;
      this.bossDuelActive = false;
      this.bossDuelIntroPlaying = false;
      this.bossSlipstreamActive = false;
      this.bossSlipstreamCharge = 0;
      if (this.bossSprite) {
        this.bossSprite.destroy();
        this.bossSprite = null;
      }
      if (this.bossDuelBannerContainer) {
        this.bossDuelBannerContainer.destroy();
        this.bossDuelBannerContainer = null;
      }
    }

    if (this.player.body) {
      const pb = this.player.body as Phaser.Physics.Arcade.Body;
      pb.setAllowGravity(true);
      pb.setVelocity(0, 0);
      pb.setAcceleration(0, 0);
    }
    this.player.setPosition(this.lastCheckpointX, 540);
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
    this.player.setOffset(116, 138);
    this.player.setTexture('sema_normal');

    // Resume scene & physics world
    this.resumeGame();

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
    const finishArchX = this.levelConfig.length - 600;
    if (this.player.x < finishArchX && (!this.bossDuelActive || !this.bossSprite || this.bossSprite.x < finishArchX)) return;

    this.isVictory = true;
    this.isInvulnerable = true;
    this.isJumpHolding = false;
    this.jumpHoldTimer = 0;
    this.clearJumpTrajectory();
    soundManager.stopMotor();
    soundManager.stopTurbine();

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

    const isDuel = this.bossDuelActive && this.bossSprite && this.bossSprite.active;

    if (isDuel && this.bossSprite) {
      const boss = this.bossSprite;
      const playerWon = this.player.x >= boss.x;
      const worldWidth = this.levelConfig.length;
      const stageCenterX = worldWidth - 360;

      // 1. Stop camera following and center camera directly on the duel stage
      if (this.cameras?.main) {
        this.cameras.main.stopFollow();
        const halfWidth = this.cameras.main.width / 2;
        this.cameras.main.setScroll(stageCenterX - halfWidth, 0);
        this.cameras.main.zoomTo(1.05, 500, 'Sine.easeInOut');
      }

      // 2. Center finish arch cleanly behind both characters
      if (this.finishArch) {
        this.finishArch.setPosition(stageCenterX, 540 - 110);
        this.finishArch.setDepth(5);
      }

      // 3. Stop physics velocity on Fantomas and position cleanly side-by-side
      const bossBody = boss.body as Phaser.Physics.Arcade.Body | null;
      if (bossBody) {
        bossBody.setVelocity(0, 0);
        bossBody.setAcceleration(0, 0);
        bossBody.setAllowGravity(false);
      }
      boss.setX(stageCenterX + 65);
      boss.setY(538);
      boss.setFlipX(true); // Fantomas looks left towards Sema
      boss.setDepth(20);
      boss.setVisible(true);
      boss.setAlpha(1);

      // 4. Stop physics velocity on Sema and position next to Fantomas facing him
      const pBody = this.player.body as Phaser.Physics.Arcade.Body | null;
      if (pBody) {
        pBody.setVelocity(0, 0);
        pBody.setAcceleration(0, 0);
        pBody.setAllowGravity(false);
      }
      this.player.setX(stageCenterX - 65);
      this.player.setY(540);
      this.player.setFlipX(false); // Sema looks right towards Fantomas
      this.player.setAngle(0);
      this.player.setDepth(20);
      this.player.setVisible(true);
      this.player.setAlpha(1);
      this.updateLightsAndEffects();

      if (playerWon) {
        // --- 🏆 СЁМА ПОБЕДИЛ! СЁМА РАДУЕТСЯ, ФАНТОМАС СТОИТ И ПЛАЧЕТ НА ФИНИШЕ 🏆 ---
        this.score += 25000;
        this.player.setTexture('sema_win');
        boss.setTexture('boss_fantomas_cry');

        // 🌟 Сёма радостно подпрыгивает от победы!
        this.tweens.add({
          targets: this.player,
          y: 520,
          duration: 280,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // 🌟 Салют искр и конфетти победы вокруг Сёмы
        this.time.addEvent({
          delay: 200,
          repeat: 50,
          callback: () => {
            if (!this.player.active) return;
            for (let i = 0; i < 3; i++) {
              const spark = this.add.rectangle(
                this.player.x + Phaser.Math.Between(-32, 32),
                this.player.y - 40 + Phaser.Math.Between(-18, 18),
                Phaser.Math.Between(4, 7),
                Phaser.Math.Between(4, 7),
                Phaser.Math.RND.pick([0xfacc15, 0x10b981, 0x38bdf8, 0xffffff])
              );
              spark.setDepth(25);
              this.tweens.add({
                targets: spark,
                y: spark.y - Phaser.Math.Between(30, 80),
                x: spark.x + Phaser.Math.Between(-35, 35),
                rotation: Math.PI * 2,
                alpha: 0,
                duration: 620,
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy(),
              });
            }
          },
        });

        // 😭 Фантомас всхлипывает от горя и поражения
        this.tweens.add({
          targets: boss,
          y: 544,
          duration: 260,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // 😭 Непрерывный поток слёз из глаз Фантомаса на 10 секунд
        this.time.addEvent({
          delay: 160,
          repeat: 60,
          callback: () => {
            if (!boss.active) return;
            for (let i = 0; i < 3; i++) {
              const tear = this.add.circle(
                boss.x + (i % 2 === 0 ? -12 : 12) + Phaser.Math.Between(-4, 4),
                boss.y - 30,
                Phaser.Math.Between(3, 5),
                0x38bdf8,
                0.9
              );
              tear.setDepth(25);
              this.tweens.add({
                targets: tear,
                x: tear.x + (i % 2 === 0 ? -35 : 35) + Phaser.Math.Between(-15, 15),
                y: boss.y + Phaser.Math.Between(15, 45),
                alpha: 0,
                scale: 0.3,
                duration: 550,
                ease: 'Quad.easeIn',
                onComplete: () => tear.destroy(),
              });
            }
          },
        });

        // Реплики радости Сёмы и рыданий Фантомаса
        const duelVictoryDialogue = [
          { boss: '«Ы-Ы-Ы! МОЙ SV ПРОИГРАЛ! КАК ЖЕ ТАК?! 😭»', sema: '«УРААА! Я ПОБЕДИЛ ФАНТОМАСА! 🏆»' },
          { boss: '«НЕТ! МОЙ РЕКОРД СБИТ! Я ВТОРОЙ... Ы-Ы-Ы!»', sema: '«МОЙ ШИМ И МОТОР ВЫДЕРЖАЛИ! ⚡»' },
          { boss: '«ПРОКЛЯТЫЙ СЁМА И ЕГО БУСТ ДО 150 КМ/Ч! 😭»', sema: '«МУХА-ХА! СЁМА — ЧЕМПИОН ГОРОДА! 🚀»' },
          { boss: '«МОЁ МОНОКОЛЕСО... ОНО ЖЕ БЫЛО ЛУЧШИМ! 😭»', sema: '«СПАСИБО ЗА ГОНКУ, ФАНТОМАС! 🏁»' },
        ];

        duelVictoryDialogue.forEach((item, idx) => {
          this.time.delayedCall(idx * 2400, () => {
            if (boss.active && this.player.active) {
              this.createSpeechBubble(boss.x, boss.y - 95, item.boss);
              soundManager.playBossCry();
              soundManager.speakBossCry(item.boss.replace(/[«»]/g, ''));

              this.time.delayedCall(700, () => {
                if (this.player.active) {
                  this.createSpeechBubble(this.player.x, this.player.y - 95, item.sema);
                }
              });
            }
          });
        });

        this.createFloatingText(this.player.x, this.player.y - 120, '🏆 СЁМА ПРАЗДНУЕТ ПОБЕДУ! ФАНТОМАС РЫДАЕТ! +25 000 🏆', '#fbbf24');
        this.triggerSpeech('МУХА-ХА! ПОБЕДА НАД ФАНТОМАСОМ!');
      } else {
        // --- 😈 ФАНТОМАС ВЫИГРАЛ! ФАНТОМАС СТОИТ И РАДУЕТСЯ, СЁМА ПЛАЧЕТ НА ФИНИШЕ 😈 ---
        this.player.setTexture('sema_lose');
        boss.setTexture('boss_fantomas_laugh');

        // 🌟 Фантомас радостно подпрыгивает от триумфа
        this.tweens.add({
          targets: boss,
          y: 520,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // 🌟 Золотое конфетти и искры вокруг Фантомаса
        this.time.addEvent({
          delay: 180,
          repeat: 55,
          callback: () => {
            if (!boss.active) return;
            for (let i = 0; i < 4; i++) {
              const spark = this.add.rectangle(
                boss.x + Phaser.Math.Between(-35, 35),
                boss.y - 45 + Phaser.Math.Between(-20, 20),
                Phaser.Math.Between(4, 8),
                Phaser.Math.Between(4, 8),
                Phaser.Math.RND.pick([0xfacc15, 0xa855f7, 0x38bdf8, 0xec4899])
              );
              spark.setDepth(25);
              this.tweens.add({
                targets: spark,
                y: spark.y - Phaser.Math.Between(30, 80),
                x: spark.x + Phaser.Math.Between(-40, 40),
                rotation: Math.PI * 2,
                alpha: 0,
                duration: 650,
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy(),
              });
            }
          },
        });

        // 😭 Сёма поник и всхлипывает от поражения
        this.tweens.add({
          targets: this.player,
          y: 545,
          duration: 250,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // 😭 Струи слёз текут из-под шлема Сёмы на протяжении 10 секунд
        this.time.addEvent({
          delay: 160,
          repeat: 60,
          callback: () => {
            if (!this.player.active) return;
            for (let i = 0; i < 3; i++) {
              const tear = this.add.circle(
                this.player.x + (i % 2 === 0 ? -10 : 10) + Phaser.Math.Between(-3, 3),
                this.player.y - 28,
                Phaser.Math.Between(3, 5),
                0x38bdf8,
                0.95
              );
              tear.setDepth(25);
              this.tweens.add({
                targets: tear,
                x: this.player.x + (i % 2 === 0 ? -30 : 30) + Phaser.Math.Between(-12, 12),
                y: this.player.y + Phaser.Math.Between(15, 45),
                alpha: 0,
                scale: 0.3,
                duration: 550,
                ease: 'Quad.easeIn',
                onComplete: () => tear.destroy(),
              });
            }
          },
        });

        // Реплики смеха Фантомаса и слёз Сёмы
        const duelDefeatDialogue = [
          { boss: '«ХА-ХА-ХА! Я ПОБЕДИЛ! МОНОКОЛЕСО SV НЕПОБЕДИМО! 🏆»', sema: '«Ы-Ы-Ы! Я ПРОИГРАЛ ДУЭЛЬ ФАНТОМАСУ! 😭»' },
          { boss: '«СЁМА, ТВОЙ ШИМ СГОРЕЛ! ПОПРОБУЙ ЕЩЁ РАЗ! 😈»', sema: '«КАК ЖЕ ТАК?! МОЁ КОЛЕСО ЧУТЬ-ЧУТЬ ОТСТАЛО! 😭»' },
          { boss: '«ФАНТОМАС — КОРОЛЬ СКОРОСТИ! ХА-ХА-ХА!»', sema: '«Ы-Ы-Ы! МОЙ МОТОР НЕ ВЫДЕРЖАЛ... 😭»' },
          { boss: '«ХА-ХА-ХА! СВ — НОМЕР ОДИН НАВСЕГДА!»', sema: '«В СЛЕДУЮЩИЙ РАЗ Я ВОЗЬМУ РЕВАНШ! 💔»' },
        ];

        duelDefeatDialogue.forEach((item, idx) => {
          this.time.delayedCall(idx * 2400, () => {
            if (boss.active && this.player.active) {
              this.createSpeechBubble(boss.x, boss.y - 95, item.boss);
              soundManager.playBossLaugh();
              soundManager.speakBossWin(item.boss.replace(/[«»]/g, ''));

              this.time.delayedCall(700, () => {
                if (this.player.active) {
                  this.createSpeechBubble(this.player.x, this.player.y - 95, item.sema);
                  soundManager.playBossCry();
                }
              });
            }
          });
        });

        this.createFloatingText(this.player.x, this.player.y - 120, '🏁 ФАНТОМАС ПРАЗДНУЕТ ПОБЕДУ, СЁМА РЫДАЕТ! 🏁', '#f43f5e');
        this.triggerSpeech('ФАНТОМАС ПРИШЁЛ ПЕРВЫМ!');
      }

      // 🌟 10-SECOND FINISH COUNTDOWN OVERLAY (FULL 10 SECONDS TO EXAMINE ANIMATIONS) 🌟
      const finishCountdownText = this.add.text(225, 95, '⏱️ ФИНИШ ДУЭЛИ: 10 сек', {
        fontFamily: 'Montserrat, Rubik, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: playerWon ? '#facc15' : '#f43f5e',
        stroke: '#09090b',
        strokeThickness: 4,
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(38);

      let remainingSec = 10;
      this.time.addEvent({
        delay: 1000,
        repeat: 9,
        callback: () => {
          remainingSec--;
          if (finishCountdownText.active) {
            finishCountdownText.setText(`⏱️ ФИНИШ ДУЭЛИ: ${remainingSec} сек`);
          }
        },
      });

      // EXACTLY 10 SECONDS (10000ms) before opening victory dialog!
      this.victoryTimer = this.time.delayedCall(10000, () => {
        if (finishCountdownText.active) finishCountdownText.destroy();
        this.victoryTimer = null;
        this.onVictory();
      });

    } else {
      // Standard level finish (1.4s)
      this.createFloatingText(this.player.x, this.player.y - 80, `🏁 УРОВЕНЬ ${this.levelConfig.id} ПРОЙДЕН! 🏁`, '#10b981');
      this.triggerSpeech(`УРОВЕНЬ ${this.levelConfig.id} ПРОЙДЕН!`);

      if (this.physics?.world) {
        this.physics.world.timeScale = 0.5;
      }

      this.victoryTimer = this.time.delayedCall(1400, () => {
        if (this.physics?.world) {
          this.physics.world.timeScale = 1.0;
        }
        this.victoryTimer = null;
        this.onVictory();
      });
    }
  }

  private updateLightsAndEffects() {
    const isFlip = this.player.flipX;
    const bodyX = this.player.x;
    const bodyY = this.player.y;
    const scale = this.player.scaleY || 0.72;
    const rot = this.player.rotation;

    // Wheel axle offset from texture center (120, 135) to axle (120, 207) = +72px down
    const distY = 72 * scale;
    const axleX = bodyX - Math.sin(rot) * distY;
    const axleY = bodyY + Math.cos(rot) * distY;

    // Headlight position attached directly to EUC front lamp
    // Lamp in canvas: X = 120 + 22, Y = 187 (+52px below center 135)
    const lx = (isFlip ? -22 : 22) * scale;
    const ly = 52 * scale;
    const lampX = bodyX + lx * Math.cos(rot) - ly * Math.sin(rot);
    const lampY = bodyY + lx * Math.sin(rot) + ly * Math.cos(rot);
    this.headlightBeam.setPosition(lampX, lampY);
    this.headlightBeam.setScale((isFlip ? -1 : 1) * scale, scale);
    this.headlightBeam.setRotation(rot);

    // Boost particle trail
    if (this.isBoosting || this.isSuperBoost) {
      this.trailEmitter.start();
      const tx = (isFlip ? 22 : -22) * scale;
      const ty = 30 * scale;
      this.trailEmitter.setPosition(bodyX + tx * Math.cos(rot) - ty * Math.sin(rot), bodyY + tx * Math.sin(rot) + ty * Math.cos(rot));
    } else {
      this.trailEmitter.stop();
    }

    // Single EUC Rotating Wheel locked at axle position
    if (this.eucWheel && this.eucWheel.active) {
      this.eucWheel.setPosition(axleX, axleY);
      this.eucWheel.setScale(scale);
      this.eucWheel.setVisible(this.player.visible);
      this.eucWheel.setAlpha(this.player.alpha);
      this.eucWheel.setDepth(this.player.depth - 0.1);

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const vx = body ? body.velocity.x : 0;
      const angularSpeed = vx / (36 * scale);
      this.eucWheel.rotation += angularSpeed * (this.game.loop.delta / 1000);
    }
  }

  /**
   * High-velocity short-lived screen distortion effect triggered on abrupt boost start:
   * 1. Snappy screen shake (physical electric motor torque jolt)
   * 2. Camera lens FOV kick (wide-angle warp with elastic snapback)
   * 3. Optical lens distortion overlay (radial speed warp streaks & chromatic aberration fringe)
   */
  private triggerBoostDistortion(isSuper: boolean = false) {
    if (!this.cameras?.main || this.isGameOver || this.isVictory || this.isCutout) return;

    // 1. PHYSICAL IMPULSE SCREEN SHAKE
    const shakeDuration = isSuper ? 180 : 140;
    const shakeIntensity = isSuper ? 0.016 : 0.010;
    this.cameras.main.shake(shakeDuration, shakeIntensity);

    // 2. LENS DISTORTION / FOV KICK (Optical wide-angle snap)
    if (this.boostLensTween) {
      this.boostLensTween.stop();
      this.boostLensTween = null;
    }
    const kickZoom = isSuper ? 0.92 : 0.945;
    this.cameras.main.setZoom(kickZoom);
    this.boostLensTween = this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.0,
      duration: isSuper ? 300 : 230,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.boostLensTween = null;
      },
    });

    // 3. OPTICAL SCREEN DISTORTION OVERLAY (Radial speed warp & chromatic aberration fringe)
    if (!this.boostDistortionOverlay) return;

    if (this.boostDistortionTween) {
      this.boostDistortionTween.stop();
      this.boostDistortionTween = null;
    }

    const g = this.boostDistortionOverlay;
    g.clear();
    g.setAlpha(1.0);

    // Anchor the radial distortion epicenter to the player's on-screen coordinate
    const screenX = Phaser.Math.Clamp(this.player.x - this.cameras.main.scrollX, 80, 370);
    const screenY = Phaser.Math.Clamp(this.player.y - this.cameras.main.scrollY, 220, 680);

    const primaryColor = isSuper ? 0xfbbf24 : 0x38bdf8; // Amber/Gold or Sky Cyan
    const altColor = isSuper ? 0xf43f5e : 0x06b6d4;     // Rose or Bright Cyan

    // A. Chromatic aberration lens border bands (barrel distortion edges)
    // Left & Right edge distortion fringes
    g.fillStyle(0x00f0ff, 0.35); // Cyan fringe
    g.fillRect(0, 0, 14, 800);
    g.fillRect(436, 0, 14, 800);

    g.fillStyle(0xff0055, 0.28); // Magenta offset fringe
    g.fillRect(10, 0, 8, 800);
    g.fillRect(432, 0, 8, 800);

    // Top & Bottom lens distortion fringes
    g.fillStyle(0x00f0ff, 0.25);
    g.fillRect(0, 0, 450, 12);
    g.fillRect(0, 788, 450, 12);

    g.fillStyle(0xff0055, 0.20);
    g.fillRect(0, 8, 450, 6);
    g.fillRect(0, 786, 450, 6);

    // B. Expanding shockwave ring at point of acceleration
    g.lineStyle(3, primaryColor, 0.85);
    g.strokeCircle(screenX, screenY, 45);
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.strokeCircle(screenX, screenY, 75);
    g.lineStyle(2, altColor, 0.5);
    g.strokeCircle(screenX, screenY, 110);

    // C. Radial speed warp streaks radiating outward across the viewport
    const numStreaks = isSuper ? 36 : 28;
    for (let i = 0; i < numStreaks; i++) {
      const angle = (i / numStreaks) * Math.PI * 2 + (Math.random() * 0.15 - 0.075);
      const innerR = 50 + Math.random() * 40;
      const outerR = innerR + 90 + Math.random() * 220;

      const x1 = screenX + Math.cos(angle) * innerR;
      const y1 = screenY + Math.sin(angle) * innerR;
      const x2 = screenX + Math.cos(angle) * outerR;
      const y2 = screenY + Math.sin(angle) * outerR;

      const isWhite = i % 3 === 0;
      const streakColor = isWhite ? 0xffffff : (i % 2 === 0 ? primaryColor : altColor);
      const streakAlpha = isWhite ? 0.85 : 0.6;
      const streakWidth = isWhite ? 2.5 : (i % 2 === 0 ? 2.0 : 1.2);

      g.lineStyle(streakWidth, streakColor, streakAlpha);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }

    // D. Smooth decay and fade out of the distortion effect
    this.boostDistortionTween = this.tweens.add({
      targets: g,
      alpha: 0,
      duration: isSuper ? 300 : 230,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        g.clear();
        this.boostDistortionTween = null;
      },
    });
  }

  private clearBoostDistortion() {
    if (this.boostLensTween) {
      this.boostLensTween.stop();
      this.boostLensTween = null;
    }
    if (this.boostDistortionTween) {
      this.boostDistortionTween.stop();
      this.boostDistortionTween = null;
    }
    if (this.boostDistortionOverlay) {
      this.boostDistortionOverlay.clear();
    }
  }

  private executeJump(jumpImpulse: number) {
    if (!this.player?.body || this.isGameOver || this.isVictory || this.isCutout) return;
    if (this.battery <= 0 && !this.isSuperBoost) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(jumpImpulse);
    soundManager.playJump();
    this.player.setTexture('sema_air');
    this.isJumpHolding = false;
    this.jumpHoldTimer = 0;
    this.clearJumpTrajectory();
  }

  /**
   * Renders a semi-transparent dotted/dashed parabolic arc predicting the player's
   * jump trajectory while holding the jump button on the ground prior to liftoff.
   */
  private drawJumpTrajectory(jumpImpulse: number) {
    if (!this.jumpTrajectoryGraphics || !this.player?.body) return;

    const g = this.jumpTrajectoryGraphics;
    g.clear();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const isFacingLeft = this.player.flipX;
    const startX = this.player.x + (isFacingLeft ? -8 : 8);
    const startY = this.player.y + 44; // Wheel ground contact point

    let simX = startX;
    let simY = startY;
    let simVx = body.velocity.x;

    // If player is stationary or moving very slowly, cast the arc in the direction they are facing
    if (Math.abs(simVx) < 40) {
      simVx = (isFacingLeft ? -1 : 1) * 160;
    }

    let simVy = jumpImpulse;
    const gravityY = this.levelConfig.gravity;
    const airDrag = 250;
    const dt = 0.022; // ~22ms simulation step
    const maxTicks = 60;
    const defaultGroundY = 650;

    const points: { x: number; y: number }[] = [{ x: simX, y: simY }];
    const elevatedSprites = this.elevatedPlatforms?.getChildren() as Phaser.Physics.Arcade.Sprite[] | undefined;

    for (let i = 0; i < maxTicks; i++) {
      // Aerodynamic air drag on X axis
      if (simVx > 0) {
        simVx = Math.max(0, simVx - airDrag * dt);
      } else if (simVx < 0) {
        simVx = Math.min(0, simVx + airDrag * dt);
      }
      simVy += gravityY * dt;
      simX += simVx * dt;
      simY += simVy * dt;

      // Detect landing on elevated platform while descending
      let hitPlatform = false;
      if (simVy > 0 && elevatedSprites && elevatedSprites.length > 0) {
        for (const ep of elevatedSprites) {
          const halfWidth = ep.displayWidth / 2 + 8;
          if (Math.abs(simX - ep.x) <= halfWidth) {
            const topY = ep.y - ep.displayHeight / 2;
            if (simY >= topY && simY <= topY + 28) {
              points.push({ x: simX, y: topY });
              hitPlatform = true;
              break;
            }
          }
        }
      }

      if (hitPlatform) break;

      // Ground plane contact
      if (simY >= defaultGroundY) {
        points.push({ x: simX, y: defaultGroundY });
        break;
      }

      points.push({ x: simX, y: simY });
    }

    if (points.length < 2) return;

    // 1. Outer subtle neon emerald glow underlayer
    g.lineStyle(4, 0x10b981, 0.22);
    this.drawDashedPolyline(g, points, 9, 7);

    // 2. Main crisp semi-transparent dotted/dashed line
    g.lineStyle(2, 0xa7f3d0, 0.65);
    this.drawDashedPolyline(g, points, 9, 7);

    // 3. Glowing dots along the arc
    for (let i = 2; i < points.length; i += 3) {
      const pt = points[i];
      g.fillStyle(0x34d399, 0.60);
      g.fillCircle(pt.x, pt.y, 2.5);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(pt.x, pt.y, 1.2);
    }

    // 4. Landing reticle / touchdown indicator
    const lastPoint = points[points.length - 1];
    // Outer ring
    g.lineStyle(2, 0x34d399, 0.75);
    g.strokeCircle(lastPoint.x, lastPoint.y, 13);
    // Inner pulse dot
    g.fillStyle(0xa7f3d0, 0.85);
    g.fillCircle(lastPoint.x, lastPoint.y, 3.5);
    // Horizontal crosshair
    g.lineStyle(1.5, 0x34d399, 0.6);
    g.lineBetween(lastPoint.x - 16, lastPoint.y, lastPoint.x + 16, lastPoint.y);
    g.lineBetween(lastPoint.x, lastPoint.y - 6, lastPoint.x, lastPoint.y + 6);
  }

  private drawDashedPolyline(
    g: Phaser.GameObjects.Graphics,
    points: { x: number; y: number }[],
    dashLen: number,
    gapLen: number
  ) {
    let isDrawing = true;
    let remainingInState = dashLen;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segDx = p2.x - p1.x;
      const segDy = p2.y - p1.y;
      const segLen = Math.hypot(segDx, segDy);
      if (segLen === 0) continue;

      const dirX = segDx / segLen;
      const dirY = segDy / segLen;
      let traveled = 0;

      while (traveled < segLen) {
        const step = Math.min(remainingInState, segLen - traveled);
        const startX = p1.x + dirX * traveled;
        const startY = p1.y + dirY * traveled;
        const endX = startX + dirX * step;
        const endY = startY + dirY * step;

        if (isDrawing) {
          g.lineBetween(startX, startY, endX, endY);
        }

        traveled += step;
        remainingInState -= step;

        if (remainingInState <= 0.001) {
          isDrawing = !isDrawing;
          remainingInState = isDrawing ? dashLen : gapLen;
        }
      }
    }
  }

  private clearJumpTrajectory() {
    if (this.jumpTrajectoryGraphics) {
      this.jumpTrajectoryGraphics.clear();
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
    if (this.isSceneReady && this.sys && this.sys.settings) {
      try {
        const sceneKey = this.sys.settings.key || 'GameScene';
        if (this.sys.settings.status === Phaser.Scenes.RUNNING && this.scene.isActive(sceneKey)) {
          if (this.physics?.world) {
            this.physics.pause();
          }
          this.scene.pause(sceneKey);
        }
      } catch {
        // Ignore errors if scene is transitioning or destroyed
      }
    }
    soundManager.stopMotor();
    soundManager.stopTurbine();
  }

  public resumeGame() {
    if (this.isSceneReady && this.sys && this.sys.settings) {
      try {
        const sceneKey = this.sys.settings.key || 'GameScene';
        if (this.sys.settings.status === Phaser.Scenes.PAUSED || this.scene.isPaused(sceneKey)) {
          if (this.physics?.world) {
            this.physics.resume();
          }
          if (this.scene.isPaused(sceneKey)) {
            this.scene.resume(sceneKey);
          }
        }
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

  // =========================================================================
  // 🌟 BOSS FANTÔMAS ON MONOWHEEL SV (DUEL SYSTEM & CINEMATIC SPAWN INTRO)
  // =========================================================================

  private setupBossDuelSystem() {
    // 1. Cinematic Letterbox Bars
    this.bossLetterboxTop = this.add.rectangle(225, -50, 450, 70, 0x000000, 0.94);
    this.bossLetterboxTop.setScrollFactor(0);
    this.bossLetterboxTop.setDepth(34);

    this.bossLetterboxBottom = this.add.rectangle(225, 850, 450, 70, 0x000000, 0.94);
    this.bossLetterboxBottom.setScrollFactor(0);
    this.bossLetterboxBottom.setDepth(34);

    // 2. Slipstream trail emitter behind Fantomas's SV
    this.bossSlipstreamEmitter = this.add.particles(0, 0, 'boss_slipstream_streak', {
      speed: { min: 40, max: 140 },
      angle: { min: 170, max: 190 },
      scale: { start: 0.85, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 420,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.bossSlipstreamEmitter.setDepth(11);
  }

  /**
   * Triggers the dramatic cinematic spawn sequence for Boss Fantomas on Monowheel SV:
   * - Dramatic purple lightning and screen shake
   * - Letterbox bars slide in
   * - Unique cinematic audio effect (deep sub-bass, cyber brass chord, tire screech, evil laugh)
   * - Fantomas rockets in at 150 km/h on his SV unicycle with purple nitro flames
   * - Hard powerslide / skid stop throwing sparks
   * - Pop-up Banner: «ДУЭЛЬ С ФАНТОМАСОМ»
   * - Dialogue bubbles and 3-2-1 countdown into full duel gameplay!
   */
  public triggerBossFantomasIntro() {
    if (this.bossIntroTriggered || this.isGameOver || this.isVictory) return;
    this.bossIntroTriggered = true;
    this.bossDuelIntroPlaying = true;

    // 0. STOP & BRAKE SÉMA TO A HALT AT THE STARTING LINE
    this.isBoosting = false;
    this.boostHoldDuration = 0;
    this.jumpBufferTimer = 0;
    this.jumpTriggered = false;
    this.inputState = { left: false, right: false, jump: false, boost: false, down: false };
    soundManager.updateMotorSpeed(0, false);
    soundManager.stopMotor();
    soundManager.updateTurbine(false, 0, false);
    soundManager.stopTurbine();
    if (this.player?.body) {
      const pb = this.player.body as Phaser.Physics.Arcade.Body;
      pb.setVelocityX(0);
      pb.setAccelerationX(0);
    }
    this.player.setTexture('sema_normal');
    this.player.setAngle(0);

    // 1. SOUND & DRAMATIC AUDIO
    soundManager.playBossIntro();

    // 2. PURGE ANY OBSTACLES/HAZARDS/ENEMIES/DRONES IN RACING SECTOR TO ENSURE 100% CLEAN RACETRACK
    const cleanMinX = this.bossIntroTriggerX - 300;
    this.obstacles.getChildren().forEach((child) => {
      const obj = child as Phaser.GameObjects.GameObject & { x?: number };
      if (obj.x && obj.x >= cleanMinX) {
        obj.destroy();
      }
    });
    this.enemies.getChildren().forEach((child) => {
      const obj = child as Phaser.GameObjects.GameObject & { x?: number };
      if (obj.x && obj.x >= cleanMinX) {
        obj.destroy();
      }
    });
    this.drones.getChildren().forEach((child) => {
      const obj = child as Phaser.GameObjects.GameObject & { x?: number };
      if (obj.x && obj.x >= cleanMinX) {
        obj.destroy();
      }
    });
    this.puddles.getChildren().forEach((child) => {
      const obj = child as Phaser.GameObjects.GameObject & { x?: number };
      if (obj.x && obj.x >= cleanMinX) {
        obj.destroy();
      }
    });
    this.poopProjectiles.getChildren().forEach((child) => {
      const obj = child as Phaser.GameObjects.GameObject & { x?: number };
      if (obj.x && obj.x >= cleanMinX) {
        obj.destroy();
      }
    });

    // 3. ATMOSPHERIC LIGHTNING & SHAKE
    this.cameras.main.flash(500, 147, 51, 234); // Deep purple neon flash
    this.cameras.main.shake(600, 0.016);

    // 3. CINEMATIC LETTERBOX BARS
    if (this.bossLetterboxTop && this.bossLetterboxBottom) {
      this.tweens.add({
        targets: this.bossLetterboxTop,
        y: 35,
        duration: 400,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.bossLetterboxBottom,
        y: 765,
        duration: 400,
        ease: 'Cubic.easeOut',
      });
    }

    // 4. SPAWN FANTOMAS ON MONOWHEEL SV (ROCKETS IN FROM RIGHT)
    const spawnX = this.cameras.main.scrollX + 680;
    const targetX = this.player.x + 190;
    const roadY = 538;

    if (!this.bossSprite) {
      this.bossSprite = this.physics.add.sprite(spawnX, roadY, 'boss_fantomas_boost');
      this.bossSprite.setScale(0.74);
      this.bossSprite.setDepth(14);
      if (this.bossSprite.body) {
        const bb = this.bossSprite.body as Phaser.Physics.Arcade.Body;
        bb.setAllowGravity(false);
        bb.setSize(48, 120);
        bb.setOffset(61, 105);
      }
    } else {
      this.bossSprite.setPosition(spawnX, roadY);
      this.bossSprite.setTexture('boss_fantomas_boost');
      this.bossSprite.setVisible(true);
      this.bossSprite.setActive(true);
    }

    // High-speed nitro zoom in with tire friction smoke
    this.tweens.add({
      targets: this.bossSprite,
      x: targetX,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (this.bossSprite && this.sparkFrictionEmitter) {
          this.sparkFrictionEmitter.explode(4, this.bossSprite.x - 30, roadY + 36);
        }
      },
      onComplete: () => {
        if (!this.bossSprite) return;
        // Hard powerslide / brake stop
        this.bossSprite.setTexture('boss_fantomas_laugh');
        soundManager.playBossLaugh();
        this.emitFrictionSparks(this.bossSprite.x, roadY + 36, 45);
        this.createFloatingText(this.bossSprite.x, roadY - 70, '⚡ ФАНТОМАС НА SV! ⚡', '#06b6d4');

        // Speech bubble from Fantomas
        this.createSpeechBubble(
          this.bossSprite.x,
          roadY - 110,
          '«ХА-ХА-ХА! СЁМА, ТВОЙ ШИМ НА ПРЕДЕЛЕ!\nДУЭЛЬ НА SV НАЧИНАЕТСЯ!»'
        );
      },
    });

    // 5. POP-UP BANNER «ДУЭЛЬ С ФАНТОМАСОМ»
    this.time.delayedCall(500, () => {
      this.showBossDuelBanner();
    });

    // 6. SEMA'S RESPONSE & COUNTDOWN SEQUENCE
    this.time.delayedCall(1900, () => {
      this.createSpeechBubble(this.player.x, this.player.y - 110, '«МУХА-ХА! СВ НЕ ПОМОЖЕТ,\nПОГНАЛИ!»');
    });

    // Countdown: 3... 2... 1... GO!
    const countdownSteps = [
      { delay: 2400, num: 3, text: '3' },
      { delay: 3000, num: 2, text: '2' },
      { delay: 3600, num: 1, text: '1' },
      { delay: 4200, num: 0, text: 'ПОГНАЛИ! 🚀' },
    ];

    countdownSteps.forEach((step) => {
      this.time.delayedCall(step.delay, () => {
        soundManager.playBossCountdown(step.num);
        this.showCountdownOverlay(step.text, step.num === 0);

        if (step.num === 0) {
          // START DUEL
          this.bossDuelIntroPlaying = false;
          this.bossDuelActive = true;
          this.bossBoostTimer = 2.5;
          soundManager.startMotor();

          if (this.bossSprite) {
            this.bossSprite.setTexture('boss_fantomas');
            if (this.bossSprite.body) {
              const bb = this.bossSprite.body as Phaser.Physics.Arcade.Body;
              bb.setVelocityX(this.bossBaseSpeed);
            }
          }

          // Launch player forward with immediate race start acceleration!
          if (this.player.body) {
            const pb = this.player.body as Phaser.Physics.Arcade.Body;
            pb.setVelocityX(this.levelConfig.baseSpeed || 320);
          }
          this.createFloatingText(this.player.x, this.player.y - 55, '🚀 СТАРТ! ПОГНАЛИ!', '#22c55e');

          // Retract letterbox bars
          if (this.bossLetterboxTop && this.bossLetterboxBottom) {
            this.tweens.add({
              targets: this.bossLetterboxTop,
              y: -50,
              duration: 350,
              ease: 'Cubic.easeIn',
            });
            this.tweens.add({
              targets: this.bossLetterboxBottom,
              y: 850,
              duration: 350,
              ease: 'Cubic.easeIn',
            });
          }

          // Hide banner
          if (this.bossDuelBannerContainer) {
            this.tweens.add({
              targets: this.bossDuelBannerContainer,
              y: this.bossDuelBannerContainer.y - 60,
              alpha: 0,
              scale: 0.8,
              duration: 300,
              ease: 'Back.easeIn',
              onComplete: () => {
                if (this.bossDuelBannerContainer) {
                  this.bossDuelBannerContainer.destroy();
                  this.bossDuelBannerContainer = null;
                }
              },
            });
          }
        }
      });
    });
  }

  /**
   * Displays the popup banner «ДУЭЛЬ С ФАНТОМАСОМ» with cyberpunk neon frame and badges.
   */
  private showBossDuelBanner() {
    if (this.bossDuelBannerContainer) {
      this.bossDuelBannerContainer.destroy();
    }

    const centerX = 225;
    const centerY = 280;

    const container = this.add.container(centerX, centerY);
    container.setScrollFactor(0);
    container.setDepth(36);
    container.setScale(0.2);
    container.setAlpha(0);

    const bgG = this.add.graphics();

    // Dark cyber-glass background
    bgG.fillStyle(0x09090b, 0.94);
    bgG.fillRoundedRect(-195, -72, 390, 144, 16);

    // Glowing double neon border (purple & crimson)
    bgG.lineStyle(3, 0xa855f7, 0.95);
    bgG.strokeRoundedRect(-195, -72, 390, 144, 16);
    bgG.lineStyle(1.5, 0xf43f5e, 0.85);
    bgG.strokeRoundedRect(-191, -68, 382, 136, 14);

    // Tech corner notches
    bgG.fillStyle(0x38bdf8, 1);
    bgG.fillRect(-193, -70, 14, 4);
    bgG.fillRect(-193, -70, 4, 14);
    bgG.fillRect(179, -70, 14, 4);
    bgG.fillRect(189, -70, 4, 14);
    bgG.fillRect(-193, 66, 14, 4);
    bgG.fillRect(-193, 56, 4, 14);
    bgG.fillRect(179, 66, 14, 4);
    bgG.fillRect(189, 56, 4, 14);

    container.add(bgG);

    // Top Pill: «⚡ БОСС: МОНОКОЛЕСО SV (150 КМ/Ч) ⚡»
    const topBadge = this.add.text(0, -48, '⚡ БОСС: МОНОКОЛЕСО SV (150 КМ/Ч) ⚡', {
      fontFamily: 'Montserrat, Rubik, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#facc15',
    }).setOrigin(0.5);
    container.add(topBadge);

    // Main Title: «ДУЭЛЬ С ФАНТОМАСОМ»
    const titleText = this.add.text(0, -15, 'ДУЭЛЬ С ФАНТОМАСОМ', {
      fontFamily: 'Montserrat, "Arial Black", Rubik, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#e11d48',
      strokeThickness: 5,
      shadow: {
        offsetX: 0,
        offsetY: 4,
        color: '#a855f7',
        blur: 14,
        stroke: true,
        fill: true,
      },
    }).setOrigin(0.5);
    container.add(titleText);

    // Subtitle: «ДЕРЖИСЬ В СЛИПСТРИМЕ ДЛЯ РЫВКА И ОБГОНИ ЕГО!»
    const subText = this.add.text(0, 22, 'ДЕРЖИСЬ В СЛИПСТРИМЕ ДЛЯ РЫВКА И ОБГОНИ ЕГО!', {
      fontFamily: 'Rubik, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#38bdf8',
      align: 'center',
    }).setOrigin(0.5);
    container.add(subText);

    // Bottom info chips
    const chipText = this.add.text(0, 44, '🏆 НАГРАДА: +25 000 ОЧКОВ ЗА ПОБЕДУ!', {
      fontFamily: 'Rubik, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#4ade80',
    }).setOrigin(0.5);
    container.add(chipText);

    this.bossDuelBannerContainer = container;

    // Pop-in bounce tween
    this.tweens.add({
      targets: container,
      scale: 1.0,
      alpha: 1,
      duration: 450,
      ease: 'Back.easeOut',
    });
  }

  private showCountdownOverlay(text: string, isGo: boolean = false) {
    const cdText = this.add.text(225, 430, text, {
      fontFamily: 'Montserrat, "Arial Black", Rubik, sans-serif',
      fontSize: isGo ? '36px' : '48px',
      fontStyle: 'bold',
      color: isGo ? '#4ade80' : '#fbbf24',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 0,
        offsetY: 3,
        color: isGo ? '#22c55e' : '#f59e0b',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(37);

    this.tweens.add({
      targets: cdText,
      scale: 1.4,
      alpha: 0,
      duration: isGo ? 800 : 550,
      ease: 'Quad.easeOut',
      onComplete: () => cdText.destroy(),
    });
  }

  /**
   * Updates Boss Fantomas racing physics, SV turbo boosts, Slipstream zone, and taunts.
   */
  private updateBossDuel(time: number, delta: number) {
    if (!this.bossSprite || !this.bossSprite.active) return;
    const boss = this.bossSprite;
    const body = boss.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // Keep Fantomas grounded on the road
    boss.setY(538);
    body.setVelocityY(0);

    // If intro is still playing or game is ended, keep boss in staging position
    if (this.bossDuelIntroPlaying || this.isVictory || this.isGameOver) {
      return;
    }

    if (!this.bossDuelActive) return;

    // 1. Calculate relative distance lead (in meters)
    this.bossDistanceLead = Math.round((this.player.x - boss.x) / 10);

    // 2. Dynamic Speed & Rubber-banding AI
    const playerSpeed = Math.abs(this.player.body ? this.player.body.velocity.x : 0);
    let targetSpeed = this.bossBaseSpeed;

    if (this.bossStunned) {
      this.bossStunTimer -= delta / 1000;
      targetSpeed = 60;
      if (this.bossStunTimer <= 0) {
        this.bossStunned = false;
        boss.setTexture('boss_fantomas');
      }
    } else {
      // Rubber banding: Fantomas speeds up if falling behind, stays competitive when ahead
      const distanceDiff = boss.x - this.player.x;
      if (distanceDiff < -140) {
        // Player ahead: Fantomas gives turbo chase!
        targetSpeed = Math.max(playerSpeed * 1.15, this.bossBaseSpeed * 1.25);
      } else if (distanceDiff > 280) {
        // Fantomas too far ahead: slight cruise deceleration
        targetSpeed = Math.max(playerSpeed * 0.95, this.bossBaseSpeed * 0.85);
      } else {
        targetSpeed = Math.max(playerSpeed * 1.02, this.bossBaseSpeed);
      }

      // Periodic SV Super-Boost Surge (every 4-6 seconds)
      this.bossBoostTimer -= delta / 1000;
      if (this.bossBoostTimer <= 0) {
        this.bossBoostTimer = Phaser.Math.Between(4, 7);
        targetSpeed *= 1.45;
        boss.setTexture('boss_fantomas_boost');

        if (this.sparkFrictionEmitter) {
          this.sparkFrictionEmitter.explode(18, boss.x - 30, boss.y + 36);
        }

        // Return to normal texture after 1.8s
        this.time.delayedCall(1800, () => {
          if (boss.active && !this.bossStunned && !this.isGameOver) {
            boss.setTexture('boss_fantomas');
          }
        });
      }
    }

    // Apply smooth acceleration to body
    const currentSpeed = body.velocity.x;
    const accelStep = (targetSpeed - currentSpeed) * Math.min(1, (delta / 1000) * 4);
    body.setVelocityX(currentSpeed + accelStep);

    // 3. Slipstream Drafting Zone:
    // When Sema rides directly behind Fantomas's SV unicycle (distance 50px to 220px, similar Y)
    const dx = boss.x - this.player.x;
    const dy = Math.abs(boss.y - this.player.y);
    const inSlipstream = dx >= 45 && dx <= 230 && dy < 50;

    if (inSlipstream && !this.isGameOver && !this.isVictory) {
      this.bossSlipstreamActive = true;
      this.bossSlipstreamCharge = Math.min(100, this.bossSlipstreamCharge + (delta / 1000) * 55);

      // Emit slipstream wake particles
      if (this.bossSlipstreamEmitter) {
        this.bossSlipstreamEmitter.emitParticleAt(boss.x - 40, boss.y + 20, 2);
      }

      // Slingshot Turbo Boost Trigger!
      if (this.bossSlipstreamCharge >= 100) {
        this.bossSlipstreamCharge = 0;
        soundManager.playBossSlipstreamBoost();
        this.createFloatingText(this.player.x, this.player.y - 70, '🚀 СЛИПСТРИМ РЫВОК! 145+ КМ/Ч!', '#00f0ff');
        this.triggerSpeech('СЛИПСТРИМ! ОБГОНЯЮ!');

        const pBody = this.player.body as Phaser.Physics.Arcade.Body;
        if (pBody) {
          pBody.setVelocityX(Math.max(pBody.velocity.x, 960));
        }

        this.triggerBoostDistortion(true);
        this.emitVoltEnergySparks(this.player.x, this.player.y + 20, true);
      }
    } else {
      this.bossSlipstreamActive = false;
      this.bossSlipstreamCharge = Math.max(0, this.bossSlipstreamCharge - (delta / 1000) * 20);
    }

    // 4. Periodic Taunts & Laughs
    this.bossTauntTimer -= delta / 1000;
    if (this.bossTauntTimer <= 0) {
      this.bossTauntTimer = Phaser.Math.Between(6, 11);
      if (this.bossDistanceLead < -5) {
        // Fantomas ahead
        const taunts = [
          '«ХА-ХА! СВ НЕ ДОГНАТЬ!»',
          '«СЁМА, ГДЕ ТВОЯ СКОРОСТЬ?!»',
          '«МОНОКОЛЕСО SV — ЛУЧШЕЕ В ГОРОДЕ!»',
        ];
        const t = Phaser.Math.RND.pick(taunts);
        this.createSpeechBubble(boss.x, boss.y - 85, t);
        soundManager.playBossLaugh();
      } else if (this.bossDistanceLead > 5) {
        // Player ahead
        const protests = [
          '«ЭЙ, СЁМА, НЕ СПЕШИ РАДОВАТЬСЯ!»',
          '«ВКЛЮЧАЮ ТУРБО SV!»',
          '«Я ЕЩЁ ВЕРНУ ЛИДЕРСТВО!»',
        ];
        const t = Phaser.Math.RND.pick(protests);
        this.createSpeechBubble(boss.x, boss.y - 85, t);
      }
    }

    // 5. Boss reaches finish arch
    if (boss.x >= this.levelConfig.length - 600 && !this.isVictory && !this.isGameOver) {
      this.handleFinish();
    }
  }
}
