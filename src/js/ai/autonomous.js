class Autonomous extends Behavior {

    constructor() {
        super();
        this.nextCheck = 0;
        this.currentDecision = null;
    }

    attach(unit) {
        super.attach(unit);

        this.updateSubBehavior();
    }

    healthInArea(point, team, radius) {
        // console.log(point, team, radius);
        return W.units
            .filter(c => c.team == team)
            .filter(unit => dist(unit, point) < radius)
            .reduce((health, unit) => health + unit.health, 0);
    }

    retreatPosition() {
        const positions = [];
        for (let i = 0 ; i < 10 ; i++) {
            const a = (i / 10) * PI * 2;
            positions.push({
                'x': this.unit.x + cos(a) * evaluate(UNIT_ATTACK_RADIUS * 4),
                'y': this.unit.y + sin(a) * evaluate(UNIT_ATTACK_RADIUS * 4)
            });
        }

        // Return a position that is available and not close to any enemy
        return pick(
            positions
                .filter(position => !W.pointInObstacle(position))
                .filter(position => this.healthInArea(position, this.unit.team.enemy, UNIT_ATTACK_RADIUS * 2) <= 0)
        );
    }

    enemyUnit() {
        const myHealth = this.healthAroundSelf();
        return pick(
            W.cyclables
                .filter(unit => unit.team == this.unit.team.enemy)
                .filter(unit => this.healthInArea(unit, unit.team, UNIT_ATTACK_RADIUS * 2) <= myHealth)
        );
    }

    friendlyUnit() {
        return pick(
            W.units
                .filter(unit => unit != this.unit && unit.team == this.unit.team)
                .filter(unit => this.healthInArea(unit, unit.team.enemy, UNIT_ATTACK_RADIUS * 2) <= 0)
        );
    }

    conquerableBeacon() {
        return pick(
            W.beacons
                .filter(beacon => beacon != this.beacon && beacon.team != this.unit.team)
                .filter(beacon => this.healthInArea(beacon, this.unit.team.enemy, UNIT_ATTACK_RADIUS * 2) <= 0)
        );
    }

    healthAroundSelf() {
        return this.healthInArea(this.unit, this.unit.team, UNIT_ATTACK_RADIUS * 2);
    }

    updateSubBehavior() {
        if (this.currentDecision) {
            if (!this.currentDecision.done() && !this.currentDecision.bad()) {
                return;
            }
        }

        let decisions = [];

        const retreatPosition = this.retreatPosition();
        if (retreatPosition) {
            const retreatBehavior = new Reach(retreatPosition);
            const retreatDecision = {
                'behavior': retreatBehavior,
                'done': () => {
                    return dist(retreatBehavior.target, this.unit) <= UNIT_ATTACK_RADIUS && this.healthInArea(this.unit, this.unit.team.enemy, UNIT_ATTACK_RADIUS) == 0;
                },
                'bad': () => {
                    return this.healthInArea(retreatBehavior.target, this.unit.team.enemy, UNIT_ATTACK_RADIUS * 4) > 0;
                }
            };
            if (DEBUG) {
                retreatDecision.label = 'retreat';
            }
            decisions.push(retreatDecision);
        }

        const attackedUnit = this.enemyUnit();
        if (attackedUnit) {
            const attackBehavior = new Chase(attackedUnit);
            const attackDecision = {
                'behavior': attackBehavior,
                'done': () => {
                    return attackBehavior.target.dead;
                },
                'bad': () => {
                    return this.healthInArea(attackedUnit, attackedUnit.team, UNIT_ATTACK_RADIUS) > this.healthAroundSelf() + 2;
                }
            };
            if (DEBUG) {
                attackDecision.label = 'attack';
            }
            decisions.push(attackDecision);
        }

        const friend = this.friendlyUnit();
        if (friend) {
            const regroupBehavior = new Chase(friend);
            const regroupDecision = {
                'behavior': regroupBehavior,
                'done': () => {
                    return dist(friend, this.unit) < UNIT_ATTACK_RADIUS;
                },
                'bad': () => {
                    return this.healthInArea(friend, friend.team.enemy, UNIT_ATTACK_RADIUS) > this.healthInArea(friend, friend.team, UNIT_ATTACK_RADIUS) + 2;
                }
            };
            if (DEBUG) {
                regroupDecision.label = 'regroup';
            }
            decisions.push(regroupDecision);
        }

        const conquerableBeacon = this.conquerableBeacon();
        if (conquerableBeacon) {
            const conquerBehavior = new Reach(conquerableBeacon);
            const conquerDecision = {
                'behavior': conquerBehavior,
                'done': () => {
                    return conquerableBeacon.team == this.unit.team;
                },
                'bad': () => {
                    return this.healthInArea(conquerableBeacon, this.unit.team.enemy, UNIT_ATTACK_RADIUS) > this.healthInArea(conquerableBeacon, this.unit.team, UNIT_ATTACK_RADIUS) + 2;
                }
            };
            if (DEBUG) {
                conquerDecision.label = 'conquer';
            }
            decisions.push(conquerDecision);
        }

        const goodDecisions = decisions.filter(decision => !decision.done() && !decision.bad());

        const decision = pick(goodDecisions);
        if (!decision) {
            return;
        }

        this.currentDecision = decision;
        this.subBehavior = this.currentDecision.behavior;
        this.subBehavior.attach(this.unit);
    }

    cycle(e) {
        super.cycle(e);

        this.nextCheck -= e;
        if (this.nextCheck <= 0) {
            this.nextCheck = 5;
            this.updateSubBehavior();
        }

        if (this.subBehavior) {
            this.subBehavior.cycle(e);
        }
    }

    reconsider() {
        return this; // never change the AI
    }

    render() {
        if (DEBUG ) {
            R.fillStyle = '#f00';
            R.font = '10pt Arial';
            R.textAlign = 'center';
            if (this.currentDecision) {
                fillText(this.currentDecision.label, this.unit.x, this.unit.y + 35);
            }
        }

        if (this.subBehavior) {
            this.subBehavior.render();
        }
    }

    reservedPosition() {
        return this.subBehavior ? this.subBehavior.reservedPosition() : this.unit;
    }

}