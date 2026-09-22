import Phaser from 'phaser';

/**
 * Procedural texture generator for «СЁМА МУХА-ХА: КАТУШКА».
 * Generates high-res cartoon graphics for Sema, EUC, obstacles, items, and environments.
 */
export function generateGameTextures(scene: Phaser.Scene) {
  // Check if textures already exist to avoid duplicate creation
  if (scene.textures.exists('sema_normal')) {
    return;
  }

  // 1. SEMA MUKHA-KHA ON EUC (NORMAL / IDLE / CROUCH / SKELETON)
  // Scaled & optimized to fit all tunnels, overhead bridges, and obstacles
  createSemaTexture(scene, 'sema_normal', { lean: 0, air: false, glow: '#f59e0b', boost: false });
  createSemaTexture(scene, 'sema_crouch', { lean: 20, air: false, glow: '#f59e0b', boost: false, crouch: true });
  createSemaTexture(scene, 'sema_lean_fwd', { lean: 12, air: false, glow: '#f59e0b', boost: false });
  createSemaTexture(scene, 'sema_lean_back', { lean: -12, air: false, glow: '#f59e0b', boost: false });
  createSemaTexture(scene, 'sema_air', { lean: 4, air: true, glow: '#f59e0b', boost: false });
  createSemaTexture(scene, 'sema_boost', { lean: 16, air: false, glow: '#38bdf8', boost: true });
  createSemaTexture(scene, 'sema_super_boost', { lean: 20, air: false, glow: '#fbbf24', boost: true, super: true });
  createSemaTexture(scene, 'sema_tiltback', { lean: -26, air: false, glow: '#ef4444', boost: false, tiltback: true });
  createSemaTexture(scene, 'sema_fall', { lean: -45, air: true, glow: '#ef4444', boost: false, fallen: true });
  createSkeletonSemaTexture(scene, 'sema_skeleton_cyan', '#00ffff', '#38bdf8');
  createSkeletonSemaTexture(scene, 'sema_skeleton_magenta', '#ff007f', '#f43f5e');
  createSkeletonSemaTexture(scene, 'sema_skeleton_green', '#39ff14', '#10b981');

  // 2. VOLT TOKEN (Electric glowing orange-gold token)
  createVoltTexture(scene);

  // 3. BATTERY PICKUP
  createBatteryTexture(scene);

  // 4. RARE LIGHTNING BONUS
  createSuperLightningTexture(scene);

  // 5. CHARGING STATION & CHECKPOINT
  createChargingStationTexture(scene);
  createCheckpointTexture(scene, false);
  createCheckpointTexture(scene, true);

  // 6. OBSTACLES
  createTrafficConeTexture(scene);
  createPuddleTexture(scene);
  createFallenScooterTexture(scene);
  createBenchTexture(scene);
  createPitBarrierTexture(scene);
  createScooterRiderTexture(scene);
  createZaceperTexture(scene);
  createYellowTaxiTexture(scene);
  createThemedLevelObstacleTextures(scene);

  // 7. TERRAIN & PLATFORMS
  createTerrainTextures(scene);
  createExtendedLevelTerrainTextures(scene);

  // 8. FINISH & VOLTARZ ARCH
  createVoltarzArchTexture(scene);
  createRampTexture(scene);

  // 9. FLYING POOP DRONES & PROJECTILES
  createFlyingDroneTexture(scene);
  createPoopTexture(scene);
  createPoopSplatTexture(scene);
}

function createSemaTexture(
  scene: Phaser.Scene,
  key: string,
  opts: { lean: number; air: boolean; glow: string; boost: boolean; super?: boolean; fallen?: boolean; crouch?: boolean; tiltback?: boolean }
) {
  const width = 170;
  const height = 230;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  // Center pivot around EUC wheel contact point (x: 85, y: 215)
  ctx.translate(85, 215);

  if (opts.fallen) {
    ctx.rotate((Math.PI / 180) * opts.lean);
  } else {
    ctx.rotate((Math.PI / 180) * opts.lean);
  }

  // --- BOOST AURA / SPEED FLAMES ---
  if (opts.boost) {
    ctx.save();
    const auraGrad = ctx.createRadialGradient(-10, -70, 20, -10, -70, 100);
    auraGrad.addColorStop(0, opts.super ? 'rgba(251, 191, 36, 0.6)' : 'rgba(56, 189, 248, 0.5)');
    auraGrad.addColorStop(0.7, opts.super ? 'rgba(245, 158, 11, 0.2)' : 'rgba(14, 165, 233, 0.15)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(-10, -70, 95, 0, Math.PI * 2);
    ctx.fill();

    // Electric arcs if super boost
    if (opts.super) {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-50, -40);
      ctx.lineTo(-30, -70);
      ctx.lineTo(-60, -90);
      ctx.lineTo(-40, -130);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- EUC WHEEL & CHASSIS (Bottom) ---
  // Tire radius 38px, center at (0, -38)
  const wheelY = -38;

  // Wheel shadow on ground
  if (!opts.air && !opts.fallen) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer Tire
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, wheelY, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Tire treads
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 28, wheelY + Math.sin(ang) * 28);
    ctx.lineTo(Math.cos(ang) * 35, wheelY + Math.sin(ang) * 35);
    ctx.stroke();
  }

  // Rim
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, wheelY, 26, 0, Math.PI * 2);
  ctx.fill();

  // Glowing LED Ring
  ctx.strokeStyle = opts.glow;
  ctx.lineWidth = 4;
  ctx.shadowColor = opts.glow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, wheelY, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0; // reset

  // Wheel Hub Axle
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, wheelY, 8, 0, Math.PI * 2);
  ctx.fill();

  // EUC Body / Shell & Suspension
  // Main body shell around wheel
  ctx.fillStyle = '#064e3b'; // Dark emerald
  ctx.beginPath();
  ctx.roundRect(-24, wheelY - 44, 48, 52, [8, 8, 4, 4]);
  ctx.fill();
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Side pads / grip pads (black leather texture)
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.roundRect(-22, wheelY - 38, 44, 32, 6);
  ctx.fill();

  // Pedals
  if (opts.tiltback) {
    // Pedals sharply angled up at front (EUC tiltback!)
    ctx.save();
    ctx.translate(0, wheelY + 8);
    ctx.rotate(-0.35); // Raised pedals
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(-28, -4, 56, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#ef4444'; // Red warning edge
    ctx.fillRect(-26, -3, 52, 2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(-28, wheelY + 8, 56, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-26, wheelY + 7, 52, 2);
  }

  // EUC Headlight Beam (facing right)
  ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
  ctx.beginPath();
  ctx.moveTo(22, wheelY - 24);
  ctx.lineTo(95, wheelY - 45);
  ctx.lineTo(95, wheelY + 5);
  ctx.closePath();
  ctx.fill();

  // Headlight lamp
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(22, wheelY - 20, 5, 0, Math.PI * 2);
  ctx.fill();

  // --- SÉMA (CHARACTER BODY) ---
  const crouchDrop = opts.crouch ? 42 : 0;

  // Legs & Knees on EUC pedals
  if (opts.crouch) {
    // Deeply bent knees in aerodynamic low tuck
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.roundRect(-22, wheelY - 20, 18, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#047857';
    ctx.beginPath();
    ctx.roundRect(2, wheelY - 20, 18, 26, 4);
    ctx.fill();

    // Low knee pads
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-20, wheelY - 14, 14, 14, 3);
    ctx.roundRect(4, wheelY - 14, 14, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Left leg (back)
    ctx.fillStyle = '#064e3b'; // Dark emerald pants
    ctx.beginPath();
    ctx.roundRect(-18, wheelY - 30, 14, 40, 5);
    ctx.fill();

    // Right leg (front)
    ctx.fillStyle = '#047857';
    ctx.beginPath();
    ctx.roundRect(4, wheelY - 30, 15, 40, 5);
    ctx.fill();

    // Knee pads (reinforced black polymer)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-20, wheelY - 18, 16, 16, 4);
    ctx.roundRect(4, wheelY - 18, 16, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Torso / Jacket (Dark Emerald & Black armored jacket)
  const torsoY = wheelY - 95 + crouchDrop;
  ctx.fillStyle = '#022c22'; // Deepest emerald
  ctx.beginPath();
  ctx.roundRect(-22, torsoY, 44, 52, [10, 10, 6, 6]);
  ctx.fill();

  // Chest Armor / Vest
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.roundRect(-16, torsoY + 6, 32, 38, 6);
  ctx.fill();

  // Orange accents & zipper on chest
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, torsoY + 6);
  ctx.lineTo(0, torsoY + 44);
  ctx.stroke();

  // Small Sleek Backpack on back (left side)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-34, torsoY + 4, 15, 36, [8, 4, 4, 8]);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-32, torsoY + 12, 10, 4);

  // Arms & Handle grip / balance pose
  // Back arm
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.roundRect(-28, torsoY + 12, 12, 32, 6);
  ctx.fill();

  // Front arm (reaching slightly forward in stylish riding posture)
  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.roundRect(14, torsoY + 10, 14, 30, 6);
  ctx.fill();

  // Elbow pads
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(14, torsoY + 22, 15, 12, 3);
  ctx.fill();

  // Sporty motorcycle gloves
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(22, torsoY + 42, 7, 0, Math.PI * 2);
  ctx.arc(-22, torsoY + 42, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10b981';
  ctx.fillRect(18, torsoY + 40, 8, 3);

  // Head & Helmet
  const headY = torsoY - 24;

  // Neck
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-6, torsoY - 6, 12, 10);

  // Helmet shell (Modern aerodynamic full-face EUC helmet)
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.ellipse(2, headY, 22, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Helmet Top Stripe (Gold / Orange)
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(-4, headY - 24, 12, 20, 3);
  ctx.fill();

  // Reflective Visor (Golden / Emerald iridescence)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(2, headY - 10, 20, 16, [4, 8, 8, 4]);
  ctx.fill();

  // Visor reflection shine
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(6, headY - 7);
  ctx.lineTo(18, headY + 3);
  ctx.stroke();

  // Chin guard & confident beard / face profile
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(2, headY + 6, 18, 10, [2, 6, 6, 2]);
  ctx.fill();

  ctx.restore();

  // Add canvas as Phaser texture
  scene.textures.addCanvas(key, canvas);
}

function createSkeletonSemaTexture(
  scene: Phaser.Scene,
  key: string,
  neonColor: string,
  glowColor: string
) {
  const width = 170;
  const height = 230;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.translate(85, 215);

  // Neon electric aura
  ctx.save();
  const aura = ctx.createRadialGradient(-5, -70, 15, -5, -70, 100);
  aura.addColorStop(0, neonColor + 'aa');
  aura.addColorStop(0.5, glowColor + '55');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(-5, -70, 95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const wheelY = -38;

  // EUC Wheel (Tire with neon rim glow)
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(0, wheelY, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Neon spokes
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(0, wheelY);
    ctx.lineTo(Math.cos(ang) * 28, wheelY + Math.sin(ang) * 28);
    ctx.stroke();
  }

  // Wheel Hub Axle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, wheelY, 7, 0, Math.PI * 2);
  ctx.fill();

  // EUC Shell with neon edges
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(-24, wheelY - 44, 48, 52, [8, 8, 4, 4]);
  ctx.fill();
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Pedals
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(-28, wheelY + 8, 56, 8, 3);
  ctx.fill();
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Headlight neon burst
  ctx.fillStyle = neonColor;
  ctx.beginPath();
  ctx.arc(22, wheelY - 20, 6, 0, Math.PI * 2);
  ctx.fill();

  // --- SKELETON BONES (Bone white + neon shadow) ---
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 12;

  // Leg bones (Femur, tibia, fibula, foot on pedals)
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 1.5;

  // Feet / Metatarsals on pedals
  ctx.beginPath();
  ctx.roundRect(-24, wheelY + 4, 16, 6, 2);
  ctx.roundRect(8, wheelY + 4, 16, 6, 2);
  ctx.fill();
  ctx.stroke();

  // Lower legs (Tibia bones)
  ctx.beginPath();
  ctx.roundRect(-16, wheelY - 20, 8, 24, 3);
  ctx.roundRect(8, wheelY - 20, 8, 24, 3);
  ctx.fill();
  ctx.stroke();

  // Knee joints
  ctx.beginPath();
  ctx.arc(-12, wheelY - 22, 6, 0, Math.PI * 2);
  ctx.arc(12, wheelY - 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Thigh bones (Femurs)
  ctx.beginPath();
  ctx.roundRect(-15, wheelY - 48, 8, 26, 3);
  ctx.roundRect(7, wheelY - 48, 8, 26, 3);
  ctx.fill();
  ctx.stroke();

  // Pelvis / Hip bone
  const hipY = wheelY - 54;
  ctx.beginPath();
  ctx.roundRect(-18, hipY, 36, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Spine (Vertebrae stack)
  const torsoY = wheelY - 95;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(-6, hipY - 8 - i * 8, 12, 6, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Ribcage (Detailed cartoon ribs with neon glow)
  for (let r = 0; r < 4; r++) {
    const ry = torsoY + 12 + r * 7;
    const rw = 26 - r * 3;
    ctx.beginPath();
    ctx.ellipse(0, ry, rw, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Clavicle & Shoulder joints
  ctx.beginPath();
  ctx.roundRect(-24, torsoY + 6, 48, 6, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-24, torsoY + 9, 6, 0, Math.PI * 2);
  ctx.arc(24, torsoY + 9, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Arm bones (Humerus, radius/ulna, hands on handlebars)
  ctx.beginPath();
  ctx.roundRect(-28, torsoY + 14, 7, 24, 3);
  ctx.roundRect(21, torsoY + 14, 7, 24, 3);
  ctx.fill();
  ctx.stroke();

  // Forearms reaching forward
  ctx.beginPath();
  ctx.roundRect(-24, torsoY + 36, 8, 16, 2);
  ctx.roundRect(16, torsoY + 36, 8, 16, 2);
  ctx.fill();
  ctx.stroke();

  // Bony hands
  ctx.beginPath();
  ctx.arc(-20, torsoY + 52, 5, 0, Math.PI * 2);
  ctx.arc(20, torsoY + 52, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Neck vertebrae
  ctx.beginPath();
  ctx.roundRect(-4, torsoY - 8, 8, 10, 2);
  ctx.fill();
  ctx.stroke();

  // SKULL & CRANIUM
  const headY = torsoY - 26;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, headY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Jaw / Teeth
  ctx.beginPath();
  ctx.roundRect(-10, headY + 12, 20, 10, [2, 2, 4, 4]);
  ctx.fill();
  ctx.stroke();

  // Teeth vertical separators
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 2;
  for (let t = -6; t <= 6; t += 4) {
    ctx.beginPath();
    ctx.moveTo(t, headY + 12);
    ctx.lineTo(t, headY + 22);
    ctx.stroke();
  }

  // Glowing neon eye sockets!
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(-6, headY, 5, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(6, headY, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright neon pupils glowing inside sockets
  ctx.fillStyle = neonColor;
  ctx.beginPath();
  ctx.arc(-6, headY, 2.5, 0, Math.PI * 2);
  ctx.arc(6, headY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Nose socket (upside down heart/triangle)
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(0, headY + 6);
  ctx.lineTo(-3, headY + 10);
  ctx.lineTo(3, headY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  scene.textures.addCanvas(key, canvas);
}

function createVoltTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 54;
  canvas.height = 54;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Glowing background aura
  const grad = ctx.createRadialGradient(27, 27, 8, 27, 27, 26);
  grad.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
  grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)');
  grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(27, 27, 26, 0, Math.PI * 2);
  ctx.fill();

  // Golden hexagon/circle token
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(27, 27, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner energy ring
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(27, 27, 14, 0, Math.PI * 2);
  ctx.fill();

  // Lightning Bolt symbol inside
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(29, 15);
  ctx.lineTo(21, 28);
  ctx.lineTo(27, 28);
  ctx.lineTo(24, 39);
  ctx.lineTo(34, 25);
  ctx.lineTo(28, 25);
  ctx.closePath();
  ctx.fill();

  scene.textures.addCanvas('token_volt', canvas);
}

function createBatteryTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 44;
  canvas.height = 58;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Battery Top Terminal
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.roundRect(16, 4, 12, 6, [3, 3, 0, 0]);
  ctx.fill();

  // Battery Body
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(6, 10, 32, 44, 6);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Green Energy Fill
  const fillGrad = ctx.createLinearGradient(0, 14, 0, 50);
  fillGrad.addColorStop(0, '#10b981');
  fillGrad.addColorStop(1, '#059669');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.roundRect(10, 18, 24, 32, 4);
  ctx.fill();

  // Lightning icon on battery
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(24, 22);
  ctx.lineTo(18, 33);
  ctx.lineTo(23, 33);
  ctx.lineTo(20, 44);
  ctx.lineTo(28, 31);
  ctx.lineTo(23, 31);
  ctx.closePath();
  ctx.fill();

  scene.textures.addCanvas('item_battery', canvas);
}

function createSuperLightningTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Electric radial aura
  const grad = ctx.createRadialGradient(30, 30, 6, 30, 30, 28);
  grad.addColorStop(0, 'rgba(254, 240, 138, 1)');
  grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.8)');
  grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(30, 30, 28, 0, Math.PI * 2);
  ctx.fill();

  // Sharp Super Lightning
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(34, 8);
  ctx.lineTo(20, 28);
  ctx.lineTo(30, 28);
  ctx.lineTo(23, 52);
  ctx.lineTo(44, 26);
  ctx.lineTo(32, 26);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  scene.textures.addCanvas('item_super_lightning', canvas);
}

function createChargingStationTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 110;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Ground charge zone / hazard base with neon border
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(5, 128, 100, 20, [6, 6, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Green charging floor glow line
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 12;
  ctx.fillRect(14, 140, 82, 4);
  ctx.shadowBlur = 0;

  // Main charging station tower
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(30, 28, 50, 102, [8, 8, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Top Illuminated Signboard "⚡ ЗАПРАВКА ⚡"
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.roundRect(6, 6, 98, 22, 5);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 8;
  ctx.font = '900 10px Rubik, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ ЗАПРАВКА ⚡', 55, 21);
  ctx.shadowBlur = 0;

  // High-res LCD Screen with battery status
  ctx.fillStyle = '#022c22';
  ctx.beginPath();
  ctx.roundRect(36, 36, 38, 28, 4);
  ctx.fill();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Battery icon on screen
  ctx.fillStyle = '#10b981';
  ctx.fillRect(42, 43, 22, 10);
  ctx.fillRect(64, 46, 2, 4);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px Rubik, sans-serif';
  ctx.fillText('100%', 55, 61);

  // Lightning fast-charge emblem on body
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(57, 72);
  ctx.lineTo(50, 84);
  ctx.lineTo(56, 84);
  ctx.lineTo(52, 98);
  ctx.lineTo(62, 82);
  ctx.lineTo(56, 82);
  ctx.closePath();
  ctx.fill();

  // Dual coiled charging cables
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(33, 86);
  ctx.bezierCurveTo(16, 96, 16, 116, 32, 120);
  ctx.stroke();

  ctx.strokeStyle = '#10b981';
  ctx.beginPath();
  ctx.moveTo(77, 86);
  ctx.bezierCurveTo(94, 96, 94, 116, 78, 120);
  ctx.stroke();

  // Ground station label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 8px Rubik, sans-serif';
  ctx.fillText('VOLTARZ CHARGE', 55, 114);

  scene.textures.addCanvas('station_charger', canvas);
}

function createCheckpointTexture(scene: Phaser.Scene, active: boolean) {
  const key = active ? 'checkpoint_active' : 'checkpoint_inactive';
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Base platform
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(10, 120, 60, 18, [6, 6, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Charging station column
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(24, 20, 32, 100, [8, 8, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = active ? '#10b981' : '#64748b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Status Screen / Light
  ctx.fillStyle = active ? '#10b981' : '#0284c7';
  ctx.shadowColor = active ? '#10b981' : '#38bdf8';
  ctx.shadowBlur = active ? 16 : 8;
  ctx.beginPath();
  ctx.roundRect(30, 34, 20, 24, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Charging cable & holster
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(26, 75);
  ctx.bezierCurveTo(12, 85, 12, 105, 26, 105);
  ctx.stroke();

  // Plug gun
  ctx.fillStyle = '#475569';
  ctx.fillRect(20, 100, 10, 10);

  // Top Neon Beacon Orb
  ctx.fillStyle = active ? '#34d399' : '#38bdf8';
  ctx.shadowColor = active ? '#34d399' : '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(40, 16, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text label: EUC CHARGE
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Rubik, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VOLT', 40, 72);

  scene.textures.addCanvas(key, canvas);
}

function createTrafficConeTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 44;
  canvas.height = 52;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Base
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(4, 42, 36, 8, 3);
  ctx.fill();

  // Cone Body (Orange)
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(18, 6);
  ctx.lineTo(26, 6);
  ctx.lineTo(36, 42);
  ctx.lineTo(8, 42);
  ctx.closePath();
  ctx.fill();

  // White reflective strips
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(15, 20);
  ctx.lineTo(29, 20);
  ctx.lineTo(32, 28);
  ctx.lineTo(12, 28);
  ctx.closePath();
  ctx.fill();

  scene.textures.addCanvas('obstacle_cone', canvas);
}

function createPuddleTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 80, 0);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
  grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
  grad.addColorStop(1, 'rgba(14, 165, 233, 0.7)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.ellipse(40, 12, 38, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // White light reflection
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(36, 9, 22, 4, 0, 0, Math.PI);
  ctx.stroke();

  scene.textures.addCanvas('obstacle_puddle', canvas);
}

function createFallenScooterTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 86;
  canvas.height = 42;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fallen scooter deck (purple/cyan rental colors)
  ctx.save();
  ctx.translate(43, 26);
  ctx.rotate((Math.PI / 180) * 8);

  // Deck
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.roundRect(-36, 0, 72, 8, 3);
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-30, 8, 8, 0, Math.PI * 2);
  ctx.arc(30, 8, 8, 0, Math.PI * 2);
  ctx.fill();

  // Handlebar stem fallen
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(44, -14);
  ctx.stroke();

  // Handlebars
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(40, -18, 8, 8, 2);
  ctx.fill();

  ctx.restore();

  scene.textures.addCanvas('obstacle_scooter_fallen', canvas);
}

function createBenchTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Legs
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(14, 46);
  ctx.lineTo(16, 26);
  ctx.moveTo(66, 46);
  ctx.lineTo(64, 26);
  ctx.stroke();

  // Bench Seat Planks
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(6, 22, 68, 8, 3);
  ctx.roundRect(8, 6, 64, 8, 3);
  ctx.fill();

  scene.textures.addCanvas('obstacle_bench', canvas);
}

function createPitBarrierTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 90;
  canvas.height = 46;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Stanchions
  ctx.fillStyle = '#475569';
  ctx.fillRect(10, 8, 6, 36);
  ctx.fillRect(74, 8, 6, 36);

  // Striped safety board (Red and White)
  ctx.save();
  ctx.beginPath();
  ctx.rect(6, 12, 78, 16);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6, 12, 78, 16);

  ctx.fillStyle = '#ef4444';
  for (let x = -20; x < 100; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x + 10, 12);
    ctx.lineTo(x + 2, 28);
    ctx.lineTo(x - 8, 28);
    ctx.fill();
  }
  ctx.restore();

  // Top flashing yellow lamp
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(13, 6, 5, 0, Math.PI * 2);
  ctx.arc(77, 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  scene.textures.addCanvas('obstacle_pit_barrier', canvas);
}

function createScooterRiderTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Green rental scooter
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(14, 86, 52, 6, 3);
  ctx.fill();

  // Scooter wheels
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(18, 92, 7, 0, Math.PI * 2);
  ctx.arc(62, 92, 7, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, 86);
  ctx.lineTo(26, 44);
  ctx.stroke();

  // Rider body in yellow hoodie
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.roundRect(32, 38, 24, 38, 6);
  ctx.fill();

  // Jeans
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(36, 68, 16, 20, 3);
  ctx.fill();

  // Head in hood
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.arc(42, 26, 13, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows / worried expression
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(40, 25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(39, 25, 2, 0, Math.PI * 2);
  ctx.fill();

  // Arms to handlebars
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 46);
  ctx.lineTo(26, 46);
  ctx.stroke();

  scene.textures.addCanvas('enemy_scooter_rider', canvas);
}

function createZaceperTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 74;
  canvas.height = 98;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Running boy in red jacket with cap backwards
  // Legs in stride
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(38, 62);
  ctx.lineTo(20, 92);
  ctx.moveTo(38, 62);
  ctx.lineTo(54, 90);
  ctx.stroke();

  // Red Windbreaker
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.roundRect(26, 30, 24, 34, 6);
  ctx.fill();

  // Head & backwards cap
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(38, 20, 11, 0, Math.PI * 2);
  ctx.fill();

  // Cap visor pointing left
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(38, 16, 11, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(20, 15, 14, 4);

  scene.textures.addCanvas('enemy_zaceper', canvas);
}

function createYellowTaxiTexture(scene: Phaser.Scene) {
  [1, 2].forEach((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = 176;
    canvas.height = 92;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- CAR WHEELS (front x=40, rear x=140, y=78) ---
    [40, 140].forEach((wx) => {
      // Tire
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, 78, 14, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(wx, 78, 8, 0, Math.PI * 2);
      ctx.fill();

      // Hubcap
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(wx, 78, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- MAIN CAR BODY (Yellow Taxi Sedan) ---
    // Lower chassis base
    ctx.fillStyle = '#eab308'; // darker yellow / amber shadow
    ctx.beginPath();
    ctx.roundRect(8, 52, 160, 24, [4, 4, 6, 6]);
    ctx.fill();

    ctx.fillStyle = '#facc15'; // bright taxi yellow
    ctx.beginPath();
    ctx.roundRect(8, 48, 160, 24, [4, 4, 4, 4]);
    ctx.fill();

    // Wheel arches cutouts
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(40, 78, 17, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(140, 78, 17, Math.PI, 0);
    ctx.fill();

    // Front bumper & radiator grille (Left side)
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, 60, 8, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 62, 4, 10);

    // Front Headlight (Left)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(8, 50, 10, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(10, 52, 6, 4);

    // Headlight glow cone
    ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
    ctx.beginPath();
    ctx.moveTo(8, 54);
    ctx.lineTo(0, 44);
    ctx.lineTo(0, 68);
    ctx.closePath();
    ctx.fill();

    // Rear Taillight (Right)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(162, 50, 6, 10, 2);
    ctx.fill();

    // Cabin / Greenhouse (roof, windshield, rear window)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(34, 50); // base of windshield
    ctx.lineTo(60, 28); // top of windshield
    ctx.lineTo(136, 28); // roof
    ctx.lineTo(154, 50); // rear window base
    ctx.closePath();
    ctx.fill();

    // Windshield (front glass)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(38, 48);
    ctx.lineTo(60, 31);
    ctx.lineTo(65, 31);
    ctx.lineTo(65, 48);
    ctx.closePath();
    ctx.fill();

    // Rear passenger window
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(112, 31);
    ctx.lineTo(134, 31);
    ctx.lineTo(150, 48);
    ctx.lineTo(112, 48);
    ctx.closePath();
    ctx.fill();

    // OPEN DRIVER-SIDE WINDOW (Center-front)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(68, 31, 40, 18);

    // --- CHECKERED TAXI STRIPE (Шашечки на кузове) ---
    const checkY = 56;
    for (let cx = 22; cx < 156; cx += 10) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx, checkY, 5, 4);
      ctx.fillRect(cx + 5, checkY + 4, 5, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 5, checkY, 5, 4);
      ctx.fillRect(cx, checkY + 4, 5, 4);
    }

    // --- ROOF TAXI LIGHTBOX (ТАХI фонарь с шашечками на крыше) ---
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(84, 17, 36, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(86, 19, 32, 8);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('TAXI', 91, 26);

    // --- THE YELLING TAXI DRIVER LEANING OUT THE WINDOW ---
    // Driver torso
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(72, 42, 26, 12);

    // Driver Arm leaning on the car door frame
    ctx.fillStyle = '#d4976a';
    ctx.fillRect(64, 44, 20, 6);
    // Gesticulating hand waving out
    const fistY = frame === 1 ? 40 : 38;
    ctx.beginPath();
    ctx.arc(63, fistY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Driver Head leaning out through the window
    const headX = frame === 1 ? 75 : 74;
    const headY = frame === 1 ? 33 : 32;

    // Driver skin tone
    ctx.fillStyle = '#d4976a';
    ctx.beginPath();
    ctx.arc(headX, headY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Dark hair & driver cap
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(headX, headY - 3, 9, Math.PI, 0);
    ctx.fill();
    // Cap visor pointing towards the front/left
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(headX - 11, headY - 5, 12, 3);

    // Eye with expressive determined look
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX - 6, headY - 3, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(headX - 6, headY - 2, 2, 2);

    // Eyebrow angled expressively
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(headX - 7, headY - 5);
    ctx.lineTo(headX - 2, headY - 3);
    ctx.stroke();

    // --- WIDE OPEN YELLING MOUTH (РОТ КРИЧИТ!) ---
    const mouthW = frame === 1 ? 7 : 9;
    const mouthH = frame === 1 ? 6 : 8;
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(headX - 4, headY + 3, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX - 6, headY + 1, 5, 2);

    // Tongue
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(headX - 4, headY + 4, 2, 0, Math.PI);
    ctx.fill();

    // Shockwave yelling sound lines
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(headX - 12, headY + 2, 5, -0.6, 0.6);
    ctx.arc(headX - 15, headY + 2, 8, -0.6, 0.6);
    ctx.stroke();

    scene.textures.addCanvas(frame === 1 ? 'enemy_yellow_taxi' : 'enemy_yellow_taxi_yell', canvas);
  });
}

function createTerrainTextures(scene: Phaser.Scene) {
  // Road / Asphalt Block
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 120;
  roadCanvas.height = 80;
  const rCtx = roadCanvas.getContext('2d');
  if (rCtx) {
    // Road asphalt
    rCtx.fillStyle = '#1e293b';
    rCtx.fillRect(0, 0, 120, 80);

    // Curb edge top
    rCtx.fillStyle = '#475569';
    rCtx.fillRect(0, 0, 120, 8);
    rCtx.fillStyle = '#94a3b8';
    rCtx.fillRect(0, 0, 120, 2);

    // Subtle road texture speckles
    rCtx.fillStyle = '#334155';
    for (let i = 0; i < 24; i++) {
      const rx = (i * 19) % 120;
      const ry = 12 + ((i * 31) % 64);
      rCtx.fillRect(rx, ry, 3, 2);
    }
  }
  scene.textures.addCanvas('tile_road', roadCanvas);

  // Sidewalk / Bike path (emerald tint)
  const bikeCanvas = document.createElement('canvas');
  bikeCanvas.width = 120;
  bikeCanvas.height = 80;
  const bCtx = bikeCanvas.getContext('2d');
  if (bCtx) {
    bCtx.fillStyle = '#064e3b';
    bCtx.fillRect(0, 0, 120, 80);
    bCtx.fillStyle = '#047857';
    bCtx.fillRect(0, 0, 120, 6);

    // Bike lane line
    bCtx.fillStyle = '#ffffff';
    bCtx.fillRect(0, 4, 120, 3);
  }
  scene.textures.addCanvas('tile_bike_lane', bikeCanvas);

  // Metal Industrial Girder
  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = 120;
  metalCanvas.height = 40;
  const mCtx = metalCanvas.getContext('2d');
  if (mCtx) {
    mCtx.fillStyle = '#334155';
    mCtx.fillRect(0, 0, 120, 40);
    mCtx.strokeStyle = '#f59e0b';
    mCtx.lineWidth = 3;
    mCtx.strokeRect(2, 2, 116, 36);

    // Truss diagonal crosses
    mCtx.strokeStyle = '#475569';
    mCtx.lineWidth = 2;
    for (let x = 0; x < 120; x += 30) {
      mCtx.beginPath();
      mCtx.moveTo(x, 2);
      mCtx.lineTo(x + 30, 38);
      mCtx.moveTo(x + 30, 2);
      mCtx.lineTo(x, 38);
      mCtx.stroke();
    }
  }
  scene.textures.addCanvas('tile_industrial', metalCanvas);
}

function createExtendedLevelTerrainTextures(scene: Phaser.Scene) {
  // 1. Embankment & Park Road (гранитная брусчатка набережной с газоном и белой полосой)
  const parkCanvas = document.createElement('canvas');
  parkCanvas.width = 120;
  parkCanvas.height = 80;
  const pCtx = parkCanvas.getContext('2d');
  if (pCtx) {
    // Red-tinted granite riverbank promenade pavement
    pCtx.fillStyle = '#3f3f46';
    pCtx.fillRect(0, 0, 120, 80);
    // Green park grass strip along curb
    pCtx.fillStyle = '#15803d';
    pCtx.fillRect(0, 0, 120, 6);
    // White marble curb
    pCtx.fillStyle = '#e4e4e7';
    pCtx.fillRect(0, 6, 120, 3);
    // Granite paving slab tiles pattern
    pCtx.strokeStyle = '#27272a';
    pCtx.lineWidth = 1.5;
    for (let x = 0; x < 120; x += 30) {
      pCtx.beginPath();
      pCtx.moveTo(x, 9);
      pCtx.lineTo(x, 80);
      pCtx.stroke();
    }
    for (let y = 20; y < 80; y += 18) {
      pCtx.beginPath();
      pCtx.moveTo(0, y);
      pCtx.lineTo(120, y);
      pCtx.stroke();
    }
  }
  scene.textures.addCanvas('tile_embankment_park', parkCanvas);

  // 2. Rooftop Track (крыши небоскребов: рубероид, медные края, неоновые полосы)
  const roofCanvas = document.createElement('canvas');
  roofCanvas.width = 120;
  roofCanvas.height = 80;
  const rfCtx = roofCanvas.getContext('2d');
  if (rfCtx) {
    rfCtx.fillStyle = '#18181b';
    rfCtx.fillRect(0, 0, 120, 80);
    // Glowing cyan/magenta rooftop neon ledge
    rfCtx.fillStyle = '#06b6d4';
    rfCtx.fillRect(0, 0, 120, 5);
    rfCtx.fillStyle = '#f43f5e';
    rfCtx.fillRect(0, 5, 120, 2);
    // Anti-slip rooftop tar stripes
    rfCtx.fillStyle = '#27272a';
    for (let i = 0; i < 6; i++) {
      rfCtx.fillRect(i * 20, 12, 10, 68);
    }
  }
  scene.textures.addCanvas('tile_rooftop', roofCanvas);

  // 3. Subway / Metro Tunnel (подземный тюбинг, шпалы, рельсы, оранжевый кабель)
  const tunnelCanvas = document.createElement('canvas');
  tunnelCanvas.width = 120;
  tunnelCanvas.height = 80;
  const tCtx = tunnelCanvas.getContext('2d');
  if (tCtx) {
    tCtx.fillStyle = '#09090b';
    tCtx.fillRect(0, 0, 120, 80);
    // Top contact rail / high-voltage orange line
    tCtx.fillStyle = '#f97316';
    tCtx.fillRect(0, 0, 120, 4);
    // Metal tunnel track ballast gravel
    tCtx.fillStyle = '#27272a';
    tCtx.fillRect(0, 4, 120, 76);
    // Steel rails
    tCtx.fillStyle = '#94a3b8';
    tCtx.fillRect(0, 12, 120, 4);
    tCtx.fillRect(0, 28, 120, 4);
    // Subway ties / sleepers
    tCtx.fillStyle = '#451a03';
    for (let x = 6; x < 120; x += 24) {
      tCtx.fillRect(x, 8, 12, 70);
    }
  }
  scene.textures.addCanvas('tile_metro_tunnel', tunnelCanvas);

  // 4. Highway Express (многополосный скоростной Кутузовский / МКАД с двойной сплошной и разделителем)
  const highwayCanvas = document.createElement('canvas');
  highwayCanvas.width = 120;
  highwayCanvas.height = 80;
  const hCtx = highwayCanvas.getContext('2d');
  if (hCtx) {
    hCtx.fillStyle = '#0f172a';
    hCtx.fillRect(0, 0, 120, 80);
    // Crash barrier metal guardrail top
    hCtx.fillStyle = '#64748b';
    hCtx.fillRect(0, 0, 120, 6);
    // Yellow double lane road marking
    hCtx.fillStyle = '#eab308';
    hCtx.fillRect(0, 8, 120, 3);
    hCtx.fillRect(0, 14, 120, 3);
    // Smooth high-speed asphalt texture
    hCtx.fillStyle = '#1e293b';
    for (let i = 0; i < 18; i++) {
      hCtx.fillRect((i * 23) % 120, 24 + ((i * 17) % 50), 4, 2);
    }
  }
  scene.textures.addCanvas('tile_highway_speedway', highwayCanvas);

  // 5. Storm Bridge (мокрый стальной решётчатый настил с лужами и отражением молний)
  const stormCanvas = document.createElement('canvas');
  stormCanvas.width = 120;
  stormCanvas.height = 80;
  const sCtx = stormCanvas.getContext('2d');
  if (sCtx) {
    sCtx.fillStyle = '#172554';
    sCtx.fillRect(0, 0, 120, 80);
    // Wet steel girder border
    sCtx.fillStyle = '#38bdf8';
    sCtx.fillRect(0, 0, 120, 3);
    sCtx.fillStyle = '#1e3a8a';
    sCtx.fillRect(0, 3, 120, 5);
    // Metal bridge grate criss-cross
    sCtx.strokeStyle = '#1d4ed8';
    sCtx.lineWidth = 1.5;
    for (let x = 0; x < 120; x += 15) {
      sCtx.beginPath();
      sCtx.moveTo(x, 8);
      sCtx.lineTo(x + 15, 80);
      sCtx.stroke();
    }
  }
  scene.textures.addCanvas('tile_storm_bridge', stormCanvas);

  // 6. Cyber Matrix Superway (неоновые сетки, киберпанк светящиеся дорожки)
  const cyberCanvas = document.createElement('canvas');
  cyberCanvas.width = 120;
  cyberCanvas.height = 80;
  const cCtx = cyberCanvas.getContext('2d');
  if (cCtx) {
    cCtx.fillStyle = '#030712';
    cCtx.fillRect(0, 0, 120, 80);
    // Ultra neon track border: electric purple & cyan
    cCtx.fillStyle = '#a855f7';
    cCtx.fillRect(0, 0, 120, 4);
    cCtx.fillStyle = '#06b6d4';
    cCtx.fillRect(0, 4, 120, 3);
    // Glowing grid lines
    cCtx.strokeStyle = '#3b82f6';
    cCtx.lineWidth = 1;
    for (let x = 0; x < 120; x += 20) {
      cCtx.beginPath();
      cCtx.moveTo(x, 8);
      cCtx.lineTo(x, 80);
      cCtx.stroke();
    }
  }
  scene.textures.addCanvas('tile_cyber_matrix', cyberCanvas);
}

function createThemedLevelObstacleTextures(scene: Phaser.Scene) {
  // 1. Storm Sewer Grate (Решетка ливнёвки) for Level 6 & 11
  const grateCanvas = document.createElement('canvas');
  grateCanvas.width = 64;
  grateCanvas.height = 20;
  const gCtx = grateCanvas.getContext('2d');
  if (gCtx) {
    gCtx.fillStyle = '#0f172a';
    gCtx.fillRect(0, 0, 64, 20);
    gCtx.strokeStyle = '#64748b';
    gCtx.lineWidth = 3;
    gCtx.strokeRect(2, 2, 60, 16);
    // Iron bars across grate
    gCtx.fillStyle = '#94a3b8';
    for (let x = 8; x < 58; x += 7) {
      gCtx.fillRect(x, 4, 3, 12);
    }
  }
  scene.textures.addCanvas('obstacle_storm_grate', grateCanvas);

  // 2. Industrial Toxic / Fuel Barrel (Бочка с надписью) for Level 3 & 7
  const barrelCanvas = document.createElement('canvas');
  barrelCanvas.width = 46;
  barrelCanvas.height = 56;
  const brCtx = barrelCanvas.getContext('2d');
  if (brCtx) {
    // Rust-orange metal barrel
    brCtx.fillStyle = '#ea580c';
    brCtx.beginPath();
    brCtx.roundRect(4, 4, 38, 48, 4);
    brCtx.fill();
    // Metal ribs / hoops
    brCtx.strokeStyle = '#431407';
    brCtx.lineWidth = 3;
    brCtx.strokeRect(4, 4, 38, 48);
    brCtx.beginPath();
    brCtx.moveTo(4, 18);
    brCtx.lineTo(42, 18);
    brCtx.moveTo(4, 38);
    brCtx.lineTo(42, 38);
    brCtx.stroke();
    // Hazard symbol
    brCtx.fillStyle = '#fef08a';
    brCtx.font = 'bold 12px sans-serif';
    brCtx.textAlign = 'center';
    brCtx.fillText('☣', 23, 32);
  }
  scene.textures.addCanvas('obstacle_industrial_barrel', barrelCanvas);

  // 3. Rooftop Air Vent / Duct (Вентиляционный короб) for Level 2 & 9
  const ventCanvas = document.createElement('canvas');
  ventCanvas.width = 60;
  ventCanvas.height = 42;
  const vCtx = ventCanvas.getContext('2d');
  if (vCtx) {
    // Galvanized zinc steel box
    vCtx.fillStyle = '#475569';
    vCtx.beginPath();
    vCtx.roundRect(2, 6, 56, 34, 3);
    vCtx.fill();
    vCtx.strokeStyle = '#06b6d4';
    vCtx.lineWidth = 2;
    vCtx.strokeRect(2, 6, 56, 34);
    // Ventilation louvers
    vCtx.fillStyle = '#0f172a';
    for (let y = 14; y < 36; y += 5) {
      vCtx.fillRect(8, y, 44, 3);
    }
  }
  scene.textures.addCanvas('obstacle_rooftop_vent', ventCanvas);

  // 4. Metro Tunnel Turnstile / Track Hazard (Метрострой отбойник) for Level 10
  const metroCanvas = document.createElement('canvas');
  metroCanvas.width = 62;
  metroCanvas.height = 46;
  const mtCtx = metroCanvas.getContext('2d');
  if (mtCtx) {
    mtCtx.fillStyle = '#1c1917';
    mtCtx.fillRect(4, 8, 54, 36);
    // Warning yellow-black hazard stripes
    mtCtx.fillStyle = '#eab308';
    for (let x = 6; x < 54; x += 12) {
      mtCtx.fillRect(x, 12, 6, 28);
    }
    // Red signal lamp
    mtCtx.fillStyle = '#ef4444';
    mtCtx.beginPath();
    mtCtx.arc(31, 6, 5, 0, Math.PI * 2);
    mtCtx.fill();
  }
  scene.textures.addCanvas('obstacle_metro_hazard', metroCanvas);

  // 5. Highway Jersey Barrier (Бетонный блок Нью-Джерси) for Level 5, 8, 12, 13, 14
  const jerseyCanvas = document.createElement('canvas');
  jerseyCanvas.width = 76;
  jerseyCanvas.height = 36;
  const jCtx = jerseyCanvas.getContext('2d');
  if (jCtx) {
    // Concrete trapezoid base
    jCtx.fillStyle = '#64748b';
    jCtx.beginPath();
    jCtx.moveTo(4, 34);
    jCtx.lineTo(72, 34);
    jCtx.lineTo(64, 4);
    jCtx.lineTo(12, 4);
    jCtx.closePath();
    jCtx.fill();
    // Yellow reflector on side
    jCtx.fillStyle = '#facc15';
    jCtx.fillRect(32, 14, 12, 8);
    jCtx.strokeStyle = '#334155';
    jCtx.lineWidth = 2;
    jCtx.stroke();
  }
  scene.textures.addCanvas('obstacle_jersey_barrier', jerseyCanvas);
}

function createRampTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 110;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Wooden / Metal kicker ramp
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(110, 64);
  ctx.lineTo(110, 6);
  ctx.quadraticCurveTo(55, 48, 0, 64);
  ctx.closePath();
  ctx.fill();

  // Edge metal plate
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Chevron arrows indicating jump
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  for (let x = 40; x <= 80; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x - 8, 48 - (x * 0.3));
    ctx.lineTo(x, 42 - (x * 0.3));
    ctx.lineTo(x + 8, 48 - (x * 0.3));
    ctx.stroke();
  }

  scene.textures.addCanvas('kicker_ramp', canvas);
}

function createVoltarzArchTexture(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 190;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Left & Right Pillars
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 30, 24, 160);
  ctx.fillRect(200, 30, 24, 160);

  // Glowing neon strips on pillars
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(26, 35, 4, 150);
  ctx.fillRect(210, 35, 4, 150);

  // Top Arch Billboard
  ctx.fillStyle = '#022c22';
  ctx.beginPath();
  ctx.roundRect(8, 6, 224, 60, 10);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.stroke();

  // VOLTARZ neon letters
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 24px Rubik, Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 12;
  ctx.fillText('VOLTARZ', 120, 38);
  ctx.shadowBlur = 0;

  // Subtitle: СХОДКА КАТУХИ
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px Rubik, sans-serif';
  ctx.fillText('СХОДКА МОНОКОЛЁСНИКОВ', 120, 56);

  // Finish banner checkered ribbon
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 68, 160, 6);
  ctx.fillStyle = '#000000';
  for (let x = 40; x < 200; x += 12) {
    ctx.fillRect(x, 68, 6, 6);
  }

  scene.textures.addCanvas('arch_voltarz', canvas);
}

function createFlyingDroneTexture(scene: Phaser.Scene) {
  const width = 84;
  const height = 54;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Carbon fiber quadcopter arms
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  // Front-left to rear-right
  ctx.moveTo(14, 20);
  ctx.lineTo(70, 36);
  // Rear-left to front-right
  ctx.moveTo(14, 36);
  ctx.lineTo(70, 20);
  ctx.stroke();

  // 2. Rotor motors & spinning blades (cyan translucent disc blur)
  const rotorPositions = [
    { x: 14, y: 18 },
    { x: 70, y: 18 },
    { x: 10, y: 36 },
    { x: 74, y: 36 },
  ];

  rotorPositions.forEach((pos, idx) => {
    // Spinning blade blur ellipse
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 13, 4, idx % 2 === 0 ? 0.15 : -0.15, 0, Math.PI * 2);
    ctx.fill();

    // White spinning speed arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 1.2);
    ctx.stroke();

    // Motor Hub
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. LED Beacons (Red on left, Green on right)
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(14, 22, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(70, 22, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 4. Central Drone Body Pod (Dark sleek body with neon visor)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(26, 18, 32, 22, 9);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Shiny top canopy
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(42, 24, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Mischievous Gnome Face / Evil funny visor on the drone
  ctx.fillStyle = '#facc15';
  // Left eye (angry/playful slant)
  ctx.beginPath();
  ctx.moveTo(33, 27);
  ctx.lineTo(38, 29);
  ctx.lineTo(34, 31);
  ctx.closePath();
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.moveTo(51, 27);
  ctx.lineTo(46, 29);
  ctx.lineTo(50, 31);
  ctx.closePath();
  ctx.fill();

  // Grinning smirk
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(42, 31, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // 6. Mechanical Cargo Drop Hatch on the bottom
  ctx.fillStyle = '#475569';
  ctx.fillRect(36, 40, 12, 6);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(38, 42, 8, 4);

  // Ready indicator light (amber blinking dot)
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(42, 44, 1.8, 0, Math.PI * 2);
  ctx.fill();

  scene.textures.addCanvas('drone_quadcopter', canvas);
}

function createPoopTexture(scene: Phaser.Scene) {
  const size = 30;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cx = 15;

  // Bottom tier (wide rounded base)
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(cx, 22, 10, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Middle tier
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(cx, 16, 7.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top swirl tier (curled peak)
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(cx, 11, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pointy curly swirl tip
  ctx.beginPath();
  ctx.moveTo(cx, 8);
  ctx.quadraticCurveTo(cx + 4, 4, cx + 2, 2.5);
  ctx.quadraticCurveTo(cx - 1, 4, cx, 8);
  ctx.fill();

  // Specular glossy 3D highlights
  ctx.fillStyle = 'rgba(254, 215, 170, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 4, 19.5, 3.5, 1.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx - 3, 14.5, 2.5, 1.2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Funny cartoon eyes (derpy/cheeky)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 3, 16, 2, 0, Math.PI * 2);
  ctx.arc(cx + 3, 16, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx - 2.5, 16, 1, 0, Math.PI * 2);
  ctx.arc(cx + 3.5, 16, 1, 0, Math.PI * 2);
  ctx.fill();

  scene.textures.addCanvas('poop_projectile', canvas);
}

function createPoopSplatTexture(scene: Phaser.Scene) {
  const width = 42;
  const height = 20;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cx = 21;
  const cy = 10;

  // Main splat blob
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Surrounding droplets
  const droplets = [
    { x: cx - 15, y: cy - 2, r: 2.2 },
    { x: cx + 15, y: cy + 1, r: 2.5 },
    { x: cx - 11, y: cy + 5, r: 1.8 },
    { x: cx + 12, y: cy - 4, r: 2 },
    { x: cx - 4, y: cy - 6, r: 1.5 },
  ];

  ctx.fillStyle = '#78350f';
  droplets.forEach((d) => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  });

  scene.textures.addCanvas('poop_splat', canvas);
}

