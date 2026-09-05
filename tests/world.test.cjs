const assert = require('node:assert/strict');
const {World} = require('../World.js');
let seed=42;
const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const w=new World(1536,864,random);
for(let i=0;i<18000;i++) {
    w.step(1/30);
    assert(w.ships.length<=10);assert(w.bullets.length<=100);assert(w.coins.length<=60);
    for(const s of w.ships)assert(Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.hp>0);
}
assert(w.kills>100);assert(w.collected>100);
w.boss();w.boss();assert.equal(w.ships.filter(s=>s.boss).length,1);
const hit=new World(800,600,()=>0.5);hit.nextSpawn=999;hit.nextBoss=999;
hit.spawn(1,false);Object.assign(hit.ships[0],{x:400,y:300,hp:1,cooldown:999});
hit.bullets.push({team:0,x:385,y:300,vx:330,vy:0,age:0});hit.step(0.05);
assert.equal(hit.ships.length,0);assert.equal(hit.coins.length,2);
assert(hit.effects.some(e=>e.file==='explode_sheet_small.png'));
hit.spawn(0,false);Object.assign(hit.ships[0],{x:400,y:300});
hit.coins=[{x:400,y:300,age:0}];hit.step(0.01);assert.equal(hit.collected,1);
for(let i=0;i<40;i++)hit.step(0.05);assert.equal(hit.effects.length,0);
console.log('PASS: 10-minute simulation, entity bounds, boss cap, lethal collision, coin pickup, effect expiry');
for(const area of ['full','top','bottom']) for(const size of [1,2,3]) for(const frequency of ['high','moderate','light']) {
    const world=new World(1536,864,random);
    world.configure({shipScale:size,enemyScale:4-size,area,frequency});
    for(let i=0;i<900;i++)world.step(1/30);
    const bounds=world.bounds();
    for(const ship of world.ships) {
        const radius=Math.max(Math.hypot(ship.w,ship.h)/2,ship.team?0:41)*world.scale(ship.team)+4;
        const margin=Math.min(radius,world.height/2);
        assert(ship.y>=margin-0.001&&ship.y<=world.height-margin+0.001);
    }
    assert(world.ships.filter(s=>!s.team).length<=world.friendlyCount);
    assert(world.ships.filter(s=>s.team&&!s.boss).length<=world.enemyCount);
    assert.equal(world.scale(0),size);assert.equal(world.scale(1),4-size);
    world.configure({shipScale:1,enemyScale:1,area:'top',frequency:'light'});
    assert(world.ships.filter(s=>!s.team).length<=2);
    assert(world.ships.every(s=>Number.isFinite(world.patrol(s).y)));
}
console.log('PASS: 27 scale/area/frequency combinations and live reduction of area and fleet');

const areaWorld=new World(1000,1000,random);
areaWorld.area='top';assert.deepEqual(areaWorld.bounds(),{top:0,bottom:200});
areaWorld.area='bottom';assert.deepEqual(areaWorld.bounds(),{top:800,bottom:1000});
for(const boss of [false,true]) {
    const shot=new World(1000,1000,()=>0.5);shot.nextSpawn=999;shot.nextBoss=999;
    shot.spawn(0,boss);shot.spawn(1,false);
    Object.assign(shot.ships[0],{x:300,y:300,angle:0,cooldown:0});
    Object.assign(shot.ships[1],{x:650,y:360,cooldown:999});
    shot.step(0.01);
    const s=shot.ships[0],b=shot.bullets[0];assert(b);
    assert.equal(b.angle,s.angle);
    const nose=(boss?s.h:s.w)/2;
    assert(Math.abs(b.x-(s.x+Math.cos(s.angle)*nose+b.vx*0.01))<0.001);
}
console.log('PASS: exact 20% bands, heading-aligned shots and boss muzzle position');
const spacing=new World(1536,864,random);spacing.nextSpawn=999;spacing.nextBoss=999;
spacing.spawn(0,false);spacing.spawn(0,false);
for(const s of spacing.ships)Object.assign(s,{x:760,y:430,angle:0,cooldown:999});
for(let i=0;i<300;i++)spacing.step(1/30);
assert(Math.hypot(spacing.ships[0].x-spacing.ships[1].x,spacing.ships[0].y-spacing.ships[1].y)>65);
assert(spacing.downward({boss:false,file:'enemy_4.png'}));
assert(!spacing.downward({boss:false,file:'enemy_1.png'}));
assert(spacing.downward({boss:true,file:'boss_1.png'}));
const large=new World(1536,864,random);large.configure({shipScale:3,enemyScale:3,area:'top',frequency:'light'});
large.spawn(1,true);const boss=large.ships[0];
assert(boss.y>=large.radius(boss));
assert(boss.y>large.bounds().bottom); // Large sprites may extend inward past a location zone.
const first=large.patrol(boss);large.time+=5;const later=large.patrol(boss);
assert(Math.hypot(first.x-later.x,first.y-later.y)>1);
console.log('PASS: separation from coincident positions, enemy 4 orientation, unclipped large-ship placement and moving patrol targets');

const variety=new World(1536,864,random);let previous=null;
for(let round=0;round<12;round++) {
    const skins=[];
    for(let i=0;i<3;i++) {
        variety.ships=[];variety.boss();const boss=variety.ships[0];
        assert.notEqual(boss.file,previous);previous=boss.file;skins.push(boss.file);
        assert.equal(variety.exhaust(boss),null);
    }
    assert.deepEqual(skins.sort(),['boss_1.png','boss_2.png','boss_3.png']);
}
for(let i=1;i<=5;i++) {
    const ship={team:1,boss:false,file:'enemy_'+i+'.png',w:i===2?48:32,h:i===2?48:32};
    assert.equal(variety.exhaust(ship).file,'enemy_thruster_sheet.png');
    assert.equal(variety.exhaust(ship).offset,i===2?33:25);
}
console.log('PASS: 12 shuffled boss rounds, no consecutive repeats, enemy exhaust on all five skins, no boss exhaust');

for(const team of [0,1]) {
    const fleet=new World(3000,1800,random);fleet.nextSpawn=999;fleet.nextBoss=999;
    for(let i=0;i<4;i++)fleet.spawn(team,false);
    const leader=fleet.ships[0];Object.assign(leader,{x:900,y:900,angle:0});
    fleet.patrol=()=>({x:2500,y:900});
    for(const ship of fleet.ships.slice(1)) {
        const slot=fleet.formation(ship);
        Object.assign(ship,{x:slot.x-100,y:slot.y+80,angle:0});
        assert.equal(slot.leader,leader);
    }
    for(let i=0;i<240;i++)fleet.step(1/30);
    for(const ship of fleet.ships.slice(1)) {
        const slot=fleet.formation(ship);
        assert(Math.hypot(ship.x-slot.x,ship.y-slot.y)<35,'Wingmate should converge to its formation slot');
        assert(ship.trail.length>0 && ship.trail.length<=32);
        assert(ship.trail.every(p=>p.age<fleet.trailLifetime));
    }
    leader.hp=0;
    assert.equal(fleet.formation(fleet.ships[1]).leader,fleet.ships[1]);
    assert.equal(fleet.exhaust(fleet.ships[1]).file,team?'enemy_thruster_sheet.png':'thrusters_sheet.png');
}
console.log('PASS: both teams converge into formation, replace fallen leaders, and retain bounded fading trails');

for(const dt of [1/20,1/30,1/60]) {
    const wake=new World(1200,800,random);wake.spawn(0,false);
    const ship=wake.ships[0];Object.assign(ship,{x:500,y:400,angle:0});
    for(let i=0;i<Math.ceil(2/dt);i++){ship.x+=80*dt;wake.updateTrail(ship,dt);}
    assert(ship.trail.length>=30 && ship.trail.length<=32);
    assert(ship.trail.at(-1).x-ship.trail[0].x>65,'Moving exhaust should leave a long wake');
    for(let i=0;i<Math.ceil(1/dt);i++)wake.updateTrail(ship,dt);
    assert.equal(ship.trail.length,0,'Stationary exhaust history should fade out');
}
console.log('PASS: continuous long wakes at 20/30/60 FPS and expiry when stationary');
