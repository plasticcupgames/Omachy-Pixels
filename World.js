// Pure simulation shared by the desktop renderer and headless tests.
function World(width, height, random) {
    this.width = width; this.height = height; this.random = random || Math.random;
    this.ships = []; this.bullets = []; this.effects = []; this.coins = [];
    this.friendlyBulletAlongHeading=false;
    this.trailLifetime=0.8; this.trailInterval=0.025;
    this.bossQueue=[]; this.lastBoss=0;
    this.time = 0; this.nextSpawn = 0; this.nextBoss = 35;
    this.collected = 0; this.kills = 0; this.serial = 0;
    this.friendlyCount = 4; this.enemyCount = 5;
    this.shipScale=1; this.enemyScale=1; this.frequency="moderate"; this.area="full";
    this.spawnInterval=1.5; this.bossInterval=65; this.fireMultiplier=1;
}
World.prototype.rand = function(a,b) { return a + this.random() * (b-a); };
World.prototype.configure = function(settings) {
    this.shipScale = [1,2,3].indexOf(settings.shipScale)>=0 ? settings.shipScale : 1;
    this.enemyScale = [1,2,3].indexOf(settings.enemyScale)>=0 ? settings.enemyScale : 1;
    this.area = ['full','top','bottom'].indexOf(settings.area)>=0 ? settings.area : 'full';
    var frequency = ['high','moderate','light'].indexOf(settings.frequency)>=0 ? settings.frequency : 'moderate';
    var changed = frequency !== this.frequency;
    this.frequency=frequency;
    var spec=frequency==='high'?[6,8,0.8,40,0.7]:frequency==='light'?[2,2,4,120,1.7]:[4,5,1.5,65,1];
    this.friendlyCount=spec[0];this.enemyCount=spec[1];this.spawnInterval=spec[2];this.bossInterval=spec[3];this.fireMultiplier=spec[4];
    if(changed){this.nextBoss=this.time+this.bossInterval;this.nextSpawn=this.time;}
    var counts=[0,0],self=this;
    this.ships=this.ships.filter(function(s){return s.boss || ++counts[s.team]<=(s.team?self.enemyCount:self.friendlyCount);});
    this.constrain();
};
World.prototype.bounds = function() {
    return {top:this.area==='bottom'?this.height*0.8:0,bottom:this.area==='top'?this.height*0.2:this.height};
};
World.prototype.scale = function(team) {return team?this.enemyScale:this.shipScale;};
// Art orientation is separate from flight heading (zero means right).
World.prototype.downward = function(s) { return s.boss || s.file==='enemy_4.png'; };
World.prototype.radius = function(s) {
    return Math.max(Math.hypot(s.w,s.h)/2,s.boss?0:(this.downward(s)?s.h:s.w)/2+25)*this.scale(s.team)+4;
};
World.prototype.constrain = function() {
    // Only physical display edges constrain sprites. Top/Bottom are destinations.
    for(var i=0;i<this.ships.length;i++) {
        var s=this.ships[i],radius=this.radius(s);
        var mx=Math.min(radius,this.width/2),my=Math.min(radius,this.height/2);
        s.x=Math.max(mx,Math.min(this.width-mx,s.x));
        s.y=Math.max(my,Math.min(this.height-my,s.y));
    }
    var height=this.height;
    this.coins.forEach(function(c){c.y=Math.max(12,Math.min(height-12,c.y));});
};
World.prototype.patrol = function(s) {
    var r=this.radius(s), zone=this.bounds();
    var centerY=(zone.top+zone.bottom)/2;
    centerY=Math.max(r,Math.min(this.height-r,centerY));
    var phase=this.time*(s.boss?0.13:0.23)+s.wander;
    var lane=(s.id%5+0.5)/5;
    var centerX=this.width*(0.18+lane*0.64);
    var rx=Math.min(this.width*0.22,220), ry=this.area==='full'?Math.min(this.height*0.24,160):this.height*0.045;
    // Alternate elliptical patrols, figure eights and long, shallow sweeps.
    var pattern=s.id%3;
    var x=centerX+Math.cos(phase)*rx;
    var y=centerY+Math.sin(phase*(pattern===1?2:1))*ry*(pattern===2?0.45:1);
    return {x:Math.max(r,Math.min(this.width-r,x)),y:Math.max(r,Math.min(this.height-r,y))};
};
// Stable slots within squads of up to four; surviving members take over leadership.
World.prototype.formation = function(s) {
    if(s.boss)return null;
    var members=this.ships.filter(function(other){return !other.boss && other.hp>0 && other.team===s.team;});
    var index=members.indexOf(s),start=Math.floor(index/4)*4;
    var leader=members[start],slot=index-start;
    var pattern=(s.team+Math.floor(start/4))%3;
    var gap=0;
    for(var i=start;i<Math.min(start+4,members.length);i++)
        gap=Math.max(gap,Math.hypot(members[i].w,members[i].h)*this.scale(s.team)+28);
    var back=0,side=0;
    if(pattern===0){back=Math.ceil(slot/2)*gap;side=(slot%2?1:-1)*Math.ceil(slot/2)*gap;}
    else if(pattern===1){back=slot*gap*0.85;side=slot*gap*0.85;}
    else {back=slot*gap;side=slot%2?gap*0.45:0;}
    // Compress the sideways spacing in the shallow top/bottom flight bands.
    if(this.area!=='full')side*=0.55;
    var angle=leader.angle,r=this.radius(s);
    return {leader:leader,slot:slot,
        x:Math.max(r,Math.min(this.width-r,leader.x-Math.cos(angle)*back-Math.sin(angle)*side)),
        y:Math.max(r,Math.min(this.height-r,leader.y-Math.sin(angle)*back+Math.cos(angle)*side))};
};
World.prototype.separation = function(s) {
    var x=0,y=0;
    for(var i=0;i<this.ships.length;i++) {
        var other=this.ships[i];if(other===s||other.hp<=0)continue;
        var dx=s.x-other.x,dy=s.y-other.y,d=Math.hypot(dx,dy);
        var gap=(Math.hypot(s.w,s.h)*this.scale(s.team)+Math.hypot(other.w,other.h)*this.scale(other.team))/2+24;
        if(d>=gap)continue;
        if(d<0.01){dx=s.id<other.id?-1:1;dy=0;d=1;}
        var push=(gap-d)/gap;
        x+=dx/d*push;y+=dy/d*push;
    }
    return {x:x,y:y};
};
World.prototype.nextBossSkin = function() {
    if(!this.bossQueue.length) {
        this.bossQueue=[1,2,3];
        for(var i=2;i>0;i--) {
            var j=Math.floor(this.rand(0,i+1));
            var temp=this.bossQueue[i];this.bossQueue[i]=this.bossQueue[j];this.bossQueue[j]=temp;
        }
        // Avoid repeating the last boss at the boundary between rounds.
        if(this.bossQueue[2]===this.lastBoss) {
            var swap=Math.floor(this.rand(0,2)),last=this.bossQueue[2];
            this.bossQueue[2]=this.bossQueue[swap];this.bossQueue[swap]=last;
        }
    }
    this.lastBoss=this.bossQueue.pop();return this.lastBoss;
};
World.prototype.exhaust = function(s) {
    if(s.boss)return null;
    return {file:s.team?'enemy_thruster_sheet.png':'thrusters_sheet.png',
        offset:(this.downward(s)?s.h:s.w)/2+9};
};
World.prototype.updateTrail = function(s,dt) {
    var lifetime=this.trailLifetime;
    s.trail=s.trail.filter(function(p){
        p.age+=dt;
        p.x-=Math.cos(p.angle)*24*dt;p.y-=Math.sin(p.angle)*24*dt;
        return p.age<lifetime;
    });
    var exhaust=this.exhaust(s);if(!exhaust)return;
    var offset=exhaust.offset*this.scale(s.team);
    var tip={x:s.x-Math.cos(s.angle)*offset,y:s.y-Math.sin(s.angle)*offset};
    var previous=s.lastExhaust||tip;
    s.lastExhaust=tip;
    if(Math.hypot(tip.x-previous.x,tip.y-previous.y)<0.01)return;
    s.trailClock+=dt;
    // Interpolate emission positions so the wake stays continuous at 10–60 FPS.
    while(s.trailClock>=this.trailInterval) {
        s.trailClock-=this.trailInterval;
        var fraction=Math.max(0,Math.min(1,1-s.trailClock/dt));
        s.trail.push({x:previous.x+(tip.x-previous.x)*fraction,
            y:previous.y+(tip.y-previous.y)*fraction,angle:s.angle,
            age:s.trailClock,frame:Math.floor(this.time*12)%4});
    }
    var limit=Math.ceil(lifetime/this.trailInterval);
    if(s.trail.length>limit)s.trail.splice(0,s.trail.length-limit);
};
World.prototype.spawn = function(team, boss) {
    var n = boss ? this.nextBossSkin() : Math.floor(this.rand(1, team ? 6 : 21));
    var w = boss ? 192 : team && n === 2 ? 48 : 32;
    var h = boss ? 128 : w;
    this.ships.push({id: ++this.serial, team: team, boss: !!boss,
        file: (boss ? 'boss_' : team ? 'enemy_' : 'ship_') + n + '.png',
        w:w, h:h, x:this.rand(w/2,this.width-w/2), y:this.rand(h/2,this.height-h/2),
        angle:team ? Math.PI : 0, hp:boss ? 32 : 4, cooldown:this.rand(0,1),
        trail:[], trailClock:0, wander:this.rand(0,Math.PI*2)});
    // Choose a spaced starting position near this ship's flight zone.
    var ship=this.ships[this.ships.length-1],zone=this.bounds(),best=null,bestClearance=-Infinity;
    for(var attempt=0;attempt<24;attempt++) {
        var x=this.rand(0,this.width),y=this.rand(zone.top,zone.bottom),r=this.radius(ship);
        x=Math.max(r,Math.min(this.width-r,x));y=Math.max(r,Math.min(this.height-r,y));
        var clearance=Infinity;
        for(var j=0;j<this.ships.length-1;j++) {
            var other=this.ships[j];clearance=Math.min(clearance,Math.hypot(x-other.x,y-other.y)-r-this.radius(other));
        }
        if(clearance>bestClearance){bestClearance=clearance;best={x:x,y:y};}
    }
    if(best){ship.x=best.x;ship.y=best.y;}
    var formation=this.formation(ship);
    if(formation && formation.slot>0) {
        ship.x=formation.x;ship.y=formation.y;ship.angle=formation.leader.angle;
    }
    this.constrain();
};
World.prototype.effect = function(x,y,big,explode,scale) {
    if (this.effects.length >= 64) this.effects.shift();
    this.effects.push({x:x,y:y,age:0,scale:scale||1,size:explode ? (big?64:32) : (big?96:48),
        frames:explode?11:7,file:(explode?'explode_sheet_':'impact_')+(big?'big':'small')+(explode?'': '_sheet')+'.png'});
};
World.prototype.step = function(dt) {
    dt = Math.min(Math.max(dt,0),0.05); this.time += dt;
    var self=this;
    this.effects=this.effects.filter(function(e){e.age+=dt;return e.age<e.frames*0.055;});
    this.coins=this.coins.filter(function(c){c.age+=dt;return c.age<22;});
    if(this.time>=this.nextSpawn) {
        this.nextSpawn=this.time+this.spawnInterval;
        for(var team=0;team<2;team++) {
            var count=this.ships.filter(function(s){return s.team===team&&!s.boss;}).length;
            if(count<(team?this.enemyCount:this.friendlyCount)) this.spawn(team,false);
        }
    }
    if(this.time>=this.nextBoss) {this.boss();this.nextBoss=this.time+this.bossInterval;}
    for(var i=0;i<this.ships.length;i++) {
        var s=this.ships[i], target=null, distance=Infinity, coinTarget=false;
        for(var j=0;j<this.ships.length;j++) {
            var other=this.ships[j]; if(other.team===s.team||other.hp<=0) continue;
            var d=Math.hypot(other.x-s.x,other.y-s.y);
            if(d<distance){distance=d;target=other;}
        }
        var enemy=target;
        if(!s.team) for(var c=0;c<this.coins.length;c++) {
            var coin=this.coins[c], cd=Math.hypot(coin.x-s.x,coin.y-s.y);
            if(cd<260 && (cd<distance || cd<110)){target=coin;distance=cd;coinTarget=true;}
        }
        var formation=this.formation(s), wingmate=formation && formation.slot>0;
        var patrol=wingmate?formation:this.patrol(s),avoid=this.separation(s);
        var px=patrol.x-s.x,py=patrol.y-s.y,plen=Math.max(1,Math.hypot(px,py));
        var steerX=px/plen,steerY=py/plen;
        if(target && !wingmate) {
            var tx=target.x-s.x,ty=target.y-s.y,tlen=Math.max(1,Math.hypot(tx,ty));
            var standOff=this.radius(s)+(!coinTarget?this.radius(target):0)+100;
            if(coinTarget){steerX=tx/tlen;steerY=ty/tlen;}
            else if(distance>standOff) {steerX+=tx/tlen*0.85;steerY+=ty/tlen*0.85;}
            else { // Curve past opponents instead of piling into their centers.
                var side=s.id%2?1:-1;
                steerX+=(-ty/tlen*side-tx/tlen*0.4)*0.8;
                steerY+=(tx/tlen*side-ty/tlen*0.4)*0.8;
            }
        }
        steerX+=avoid.x*3;steerY+=avoid.y*3;
        var r=this.radius(s),edge=65;
        if(s.x<r+edge)steerX+=(r+edge-s.x)/edge*2;
        if(s.x>this.width-r-edge)steerX-=(s.x-(this.width-r-edge))/edge*2;
        if(s.y<r+edge)steerY+=(r+edge-s.y)/edge*2;
        if(s.y>this.height-r-edge)steerY-=(s.y-(this.height-r-edge))/edge*2;
        if(this.area!=='full')steerY+=(patrol.y-s.y)/70;
        var desired=Math.atan2(steerY,steerX);
        var delta=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
        if(!wingmate)s.angle+=Math.max(-dt*1.7,Math.min(dt*1.7,delta));
        var speed=(s.boss?32:coinTarget?110:78)*(0.9+0.1*Math.sin(this.time*0.8+s.wander));
        if(wingmate) {
            // Match the leader's velocity and gently close the slot error.
            var leader=formation.leader;
            var vx=Math.cos(leader.angle)*(leader.speed||78)+px*1.4;
            var vy=Math.sin(leader.angle)*(leader.speed||78)+py*1.4;
            desired=Math.atan2(vy,vx);
            delta=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
            s.angle+=Math.max(-dt*2.8,Math.min(dt*2.8,delta));
            speed=Math.max(30,Math.min(150,Math.hypot(vx,vy)));
        }
        s.speed=speed;
        // Small lateral drift lets close neighbors part even during a wide turn.
        s.x+=(Math.cos(s.angle)*speed+avoid.x*65)*dt;
        s.y+=(Math.sin(s.angle)*speed+avoid.y*65)*dt;
        this.updateTrail(s,dt);
        var scale=this.scale(s.team);
        s.cooldown-=dt;
        if(enemy&&s.cooldown<=0&&this.bullets.length<100) {
            var aim=Math.atan2(enemy.y-s.y,enemy.x-s.x);
            if(Math.abs(Math.atan2(Math.sin(aim-s.angle),Math.cos(aim-s.angle)))<0.5) {
                // Fire along the nose, not sideways toward a target while turning.
                var heading=s.angle, nose=(this.downward(s)?s.h:s.w)*scale/2;
                this.bullets.push({team:s.team,x:s.x+Math.cos(heading)*nose,y:s.y+Math.sin(heading)*nose,
                    vx:Math.cos(heading)*330,vy:Math.sin(heading)*330,angle:heading,age:0});
                s.cooldown=(s.boss?0.24:this.rand(0.55,1.1))*this.fireMultiplier;
            }
        }
        if(!s.team) this.coins=this.coins.filter(function(coin){
            if(Math.hypot(coin.x-s.x,coin.y-s.y)<s.w*scale/2+12){self.collected++;self.effects.push({x:coin.x,y:coin.y,age:0,size:16,frames:5,file:'coin_particle.png',particle:true});return false;}return true;
        });
    }
    this.bullets=this.bullets.filter(function(b){
        var ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
        for(var k=0;k<self.ships.length;k++) {
            var s=self.ships[k];if(s.team===b.team||s.hp<=0)continue;
            var dx=b.x-ox,dy=b.y-oy,len=dx*dx+dy*dy;
            var t=len?Math.max(0,Math.min(1,((s.x-ox)*dx+(s.y-oy)*dy)/len)):0;
            var radius=Math.min(s.w,s.h)*self.scale(s.team)*0.38+3*self.scale(b.team);
            var px=ox+t*dx-s.x,py=oy+t*dy-s.y;
            var angle=b.angle===undefined?Math.atan2(b.vy,b.vx):b.angle;
            var separation=8*self.scale(b.team);
            var offsetX=(self.friendlyBulletAlongHeading?Math.cos(angle):-Math.sin(angle))*separation;
            var offsetY=(self.friendlyBulletAlongHeading?Math.sin(angle):Math.cos(angle))*separation;
            var hit=b.team ? Math.hypot(px,py)<radius :
                Math.min(Math.hypot(px+offsetX,py+offsetY),Math.hypot(px-offsetX,py-offsetY))<radius;
            if(hit) {
                s.hp--;self.effect(b.x,b.y,s.boss,false,self.scale(s.team));
                if(s.hp<=0){self.kills++;self.effect(s.x,s.y,s.boss||s.w>32,true,self.scale(s.team));
                    if(s.team)for(var n=0;n<(s.boss?8:2);n++) if(self.coins.length<60)self.coins.push({x:s.x+self.rand(-22,22),y:s.y+self.rand(-22,22),age:0});}
                return false;
            }
        }
        return b.age<3&&b.x>0&&b.y>0&&b.x<self.width&&b.y<self.height;
    });
    this.ships=this.ships.filter(function(s){return s.hp>0;});
    this.constrain();
};
World.prototype.boss=function(){if(!this.ships.some(function(s){return s.boss;}))this.spawn(1,true);};
if(typeof module!=='undefined')module.exports={World:World};
