import { WidMonsterUtil } from "./widmonsterutil.mjs";

export class WIDMonster {
    monsterId = null;
    safetyFactor = 1;
    afflictionFactor = 20;
    monsterArea = null;

    gameClone = null;

    dummyEnemy = null;
    dummyPlayer = null;
    dummyMonster = null;

    name = null;
    attackStyle = null;

    canStun = false;
    canSleep = false;
    stunDamageMultiplier = 1;
    sleepDamageMultiplier = 1;
    conditionDamageMultiplier = 1;

    damageTakenPerAttackEffect = 0;
    damageTakenPerAttack = 0;
    effectiveDamageTakenPerAttack = 0;
    monsterPassiveDecreasedPlayerDamageReduction = 0;

    combatTriangleMultiplier = 1;

    specialAttacks = [];
    specialAttackChanceTotal = 0;

    normalAttackMaxHit = 0;
    effectiveNormalAttackMaxHit = 0;

    specialAttackMaxHit = 0;
    effectiveSpecialAttackMaxHit = 0;
    maxHittingSpecialAttack = null;
    effectiveMaxHittingSpecialAttack = null;

    maxHit = 0;
    effectiveMaxHit = 0;

    increasedMaxHitPercentModifier = 0;
    increasedMaxHitFlatModifier = 0; 
    decreasedMaxHitpointsModifier = 0;
    decreasedDamageReductionModifier = 0;

    // Internal player values
    _playerAttackStyle = null;
    _playerDamageReduction = 0;

    media = "";

    constructor(monsterId, monsterArea, safetyFactor = 1, afflictionFactor = 0) {
        this.monsterId = monsterId;
        this.safetyFactor = safetyFactor;
        this.afflictionFactor = afflictionFactor;
        this.monsterArea = monsterArea;

        this.gameClone = $.extend(true, {}, game);

        this.dummyEnemy = new Enemy(this.gameClone.combat, this.gameClone);
        this.dummyPlayer = $.extend(true, {}, this.gameClone).combat.player;

        this.dummyMonster = this.gameClone.monsters.find(m => m.id === this.monsterId);
        this.media = this.dummyMonster.media;

        this.dummyEnemy.setNewMonster(this.dummyMonster);
        this.dummyEnemy.target = this.dummyPlayer;

        this.dummyEnemy = new Enemy(this.gameClone.combat, this.gameClone);
        this.dummyPlayer = $.extend(true, {}, this.gameClone).combat.player;

        this.dummyMonster = this.gameClone.monsters.find(m => m.id === this.monsterId);
        this.media = this.dummyMonster.media;

        this.dummyEnemy.setNewMonster(this.dummyMonster);
        this.dummyEnemy.target = this.dummyPlayer;


        this.dummyEnemy.computeMaxHit();

        this._playerAttackStyle = this.dummyPlayer.attackType;

        this._playerDamageReduction = this._computeStandardDamageReduction();

        this.specialAttackChanceTotal = 0;
        this.name = this.dummyMonster._name;
        this.attackStyle = this.dummyMonster.attackType;

        this.combatTriangleMultiplier = this._combatTriangleMultiplier();

        // Yes very ugly, but it figures out if the monster has a passive that reduces player damage reduction
        if(this.dummyMonster.passives.length > 0 && this.dummyMonster.passives
            .some(p => Object.keys(p.modifiers)
            .some(m => m === "decreasedPlayerDamageReduction"))) {

            this.monsterPassiveDecreasedPlayerDamageReduction = 
            this.dummyMonster.passives
            .filter(p => Object.keys(p.modifiers)
            .some(m => m === "decreasedPlayerDamageReduction"))[0]
            .modifiers.decreasedPlayerDamageReduction;
        } else {
            this.monsterPassiveDecreasedPlayerDamageReduction = 0;
        }

        // TODO: Stun passive

        if(monsterArea && monsterArea.areaEffect) {
            if(monsterArea.areaEffect.modifier === "increasedDamageTakenPerAttack") {
                this.damageTakenPerAttackEffect = this.monsterArea.areaEffect.magnitude;
                this.effectiveDamageTakenPerAttackEffect = this._slayerNegationForAreaEffect(this.damageTakenPerAttackEffect);
                this.damageTakenPerAttack = Math.floor((this.dummyPlayer.stats.maxHitpoints * this.damageTakenPerAttackEffect) / 100);
                this.effectiveDamageTakenPerAttack = Math.floor((this.dummyPlayer.stats.maxHitpoints * this.effectiveDamageTakenPerAttackEffect) / 100);
            } else {
                this.damageTakenPerAttackEffect = 0;
                this.effectiveDamageTakenPerAttackEffect = 0;
                this.damageTakenPerAttack = 0;
                this.effectiveDamageTakenPerAttack = 0;
            }
        } else {
            this.damageTakenPerAttackEffect = 0;
            this.effectiveDamageTakenPerAttackEffect = 0;
            this.damageTakenPerAttack = 0;
            this.effectiveDamageTakenPerAttack = 0;
        }
        
        this.dummyEnemy.availableAttacks.forEach(specialAttack => {

            this.specialAttackChanceTotal += specialAttack.chance;

            let canStun = false;
            let canSleep = false;

            // When you are stunned, monsters hit for 30% more
            // We're calculating the worst-case-scenario, so if a monster can stun with any attack,
            // we assume that the 30% always applies
            if(specialAttack.attack.onhitEffects.some((e) => e.type === "Stun") ||
            specialAttack.attack.prehitEffects.some((e) => e.type === "Stun")) {
                canStun = true;
                this.canStun = true;
                this.stunDamageMultiplier = 1.3;
            }

            // When you are sleeping, monsters hit for 20% more
            // We're calculating the worst-case-scenario, so if a monster can sleep with any attack,
            // we assume that the 20% always applies
            if(specialAttack.attack.onhitEffects.some((e) => e.type === "Sleep") ||
            specialAttack.attack.prehitEffects.some((e) => e.type === "Sleep")) {
                canSleep = true;
                this.canSleep = true;
                this.sleepDamageMultiplier = 1.2;
            }

            // Torment and despair
            if(specialAttack.attack.onhitEffects.some((e) => e.curse !== undefined && e.curse.id === "melvorTotH:Despair") ||
            specialAttack.attack.prehitEffects.some((e) => e.curse !== undefined && e.curse.id === "melvorTotH:Torment")) {
                //canSleep = true;
                //this.canSleep = true;
                //this.sleepDamageMultiplier = 1.2;
            }

            this.specialAttacks.push({
                specialAttackName: specialAttack.attack.name,
                canStun,
                canSleep,
                originalSpecialAttack: specialAttack.attack
            });
        });

        if(this.monsterId === "melvorTotH:VorloranProtector") {
            this.canStun = true;
            this.stunDamageMultiplier = 1.3;
        }

        if(this.canStun || this.canSleep) {
            this.conditionDamageMultiplier = Math.max(this.stunDamageMultiplier, this.sleepDamageMultiplier);
        }

        // Enemy cannot normal attack, if it will always use some special attack and none of them can normal attack
        if(this.specialAttackChanceTotal >= 100 && 
            this.dummyEnemy.availableAttacks.every(a => a.attack.canNormalAttack === false && 
            a.attack.description.toLowerCase().indexOf('normal attack') === -1)
        ) {
            this.canNormalAttack = false;
        } else {
            this.canNormalAttack = true;
        }

        // Fetch certain monster specific modifier bullshit
        const {
            increasedMaxHitPercentModifier,
            increasedMaxHitFlatModifier,
            decreasedMaxHitpointsModifier,
            decreasedDamageReductionModifier
        } = WidMonsterUtil.getMonsterSpecificBullshit(this.monsterId, this.afflictionFactor);

        this.increasedMaxHitPercentModifier = increasedMaxHitPercentModifier;
        this.increasedMaxHitFlatModifier = increasedMaxHitFlatModifier;
        this.decreasedMaxHitpointsModifier = decreasedMaxHitpointsModifier;
        this.decreasedDamageReductionModifier = decreasedDamageReductionModifier;


        this.normalAttackMaxHit = this._calculateStandardMaxHit(this.dummyEnemy)

        const dmgs = (this.normalAttackMaxHit + increasedMaxHitFlatModifier) * this.conditionDamageMultiplier * this.safetyFactor * increasedMaxHitPercentModifier;

        const pred = this._playerDamageReduction - this.monsterPassiveDecreasedPlayerDamageReduction - decreasedDamageReductionModifier < 0 ? 0 
                    : this._playerDamageReduction - this.monsterPassiveDecreasedPlayerDamageReduction - decreasedDamageReductionModifier;

        const reds = Math.floor(pred * this.combatTriangleMultiplier) / 100;
        this.effectiveNormalAttackMaxHit = Math.floor(dmgs * (1 - reds));

        this.specialAttacks = this.specialAttacks.map(specialAttack => {
            const maxHit = this._specialAttackDamage(specialAttack.originalSpecialAttack);

            const dmgs = (maxHit + increasedMaxHitFlatModifier) * this.conditionDamageMultiplier * this.safetyFactor * increasedMaxHitPercentModifier;

            const pred = this._playerDamageReduction - this.monsterPassiveDecreasedPlayerDamageReduction - decreasedDamageReductionModifier < 0 ? 0 
                        : this._playerDamageReduction - this.monsterPassiveDecreasedPlayerDamageReduction - decreasedDamageReductionModifier;

            const reds = Math.floor(pred * this.combatTriangleMultiplier) / 100;
            const effectiveMaxHit = Math.floor(dmgs * (1 - reds));
            
            return {
                ...specialAttack,
                maxHit,
                effectiveMaxHit
            }
        });

        let specialAttackMaxHit = 0;
        let maxHittingSpecialAttack = null;
        let effectiveSpecialAttackMaxHit = 0;
        let effectiveMaxHittingSpecialAttack = null;

        this.specialAttacks.forEach(specialAttack => { 
            if(specialAttack.maxHit > specialAttackMaxHit) {
                specialAttackMaxHit = specialAttack.maxHit;
                maxHittingSpecialAttack = specialAttack;
            }

            if(specialAttack.effectiveMaxHit > effectiveSpecialAttackMaxHit) {
                effectiveSpecialAttackMaxHit = specialAttack.effectiveMaxHit;
                effectiveMaxHittingSpecialAttack = specialAttack;
            }
        });

        this.specialAttackMaxHit = specialAttackMaxHit;
        this.maxHittingSpecialAttack = maxHittingSpecialAttack;
        this.effectiveSpecialAttackMaxHit = effectiveSpecialAttackMaxHit;
        this.effectiveMaxHittingSpecialAttack = effectiveMaxHittingSpecialAttack;

        if(this.canNormalAttack) {
            this.maxHit = Math.max(this.normalAttackMaxHit, this.specialAttackMaxHit);
            this.effectiveMaxHit = Math.max(this.effectiveNormalAttackMaxHit, this.effectiveSpecialAttackMaxHit);
        } else {
            this.maxHit = this.specialAttackMaxHit;
            this.effectiveMaxHit = this.effectiveSpecialAttackMaxHit;
        }

    }

    whatMakesMeDangerous() {
        let explain = {
            monsterName: this.name,
            affliction: {
                canAfflict: this.decreasedMaxHitpointsModifier < 1,
                afflictionFactor: this.afflictionFactor,
                afflictionEffect: this.decreasedMaxHitpointsModifier
            }
        };

        if(this.canNormalAttack && (this.normalAttackMaxHit > this.specialAttackMaxHit)) {
            explain.bestAttackName = "Normal Attack";
            explain.maxHit = this.normalAttackMaxHit;
            explain.effectiveMaxHit = this.effectiveNormalAttackMaxHit;
            explain.attackStyle = this.attackStyle;

            const [equation, vars] = WidMonsterUtil.maxHitEquationHTML(
                this.monsterId,
                this.afflictionFactor,
                this.normalAttackMaxHit, 
                this.conditionDamageMultiplier, 
                this.safetyFactor, 
                this.monsterPassiveDecreasedPlayerDamageReduction, 
                this._playerDamageReduction, 
                this.combatTriangleMultiplier
            );

            explain.equation = equation;
            explain.vars = vars;
            explain.simpleExplanation = WidMonsterUtil.maxHitEquationSimple(
                this.name,
                this.monsterId,
                this.afflictionFactor,
                this.normalAttackMaxHit, 
                this.conditionDamageMultiplier, 
                this.safetyFactor, 
                this.monsterPassiveDecreasedPlayerDamageReduction, 
                this._playerDamageReduction, 
                this.combatTriangleMultiplier,
                this.canStun,
                this.canSleep
            );
        } else {
            explain.bestAttackName = this.maxHittingSpecialAttack.specialAttackName;
            explain.maxHit = this.specialAttackMaxHit;
            explain.effectiveMaxHit = this.effectiveSpecialAttackMaxHit;
            //explain.attackStyle = this.maxHittingSpecialAttack.originalSpecialAttack.attackStyle;
            explain.attackStyle = this.attackStyle;

            const [equation, vars] = WidMonsterUtil.maxHitEquationHTML(
                this.monsterId,
                this.afflictionFactor,
                this.specialAttackMaxHit, 
                this.conditionDamageMultiplier, 
                this.safetyFactor, 
                this.monsterPassiveDecreasedPlayerDamageReduction, 
                this._playerDamageReduction, 
                this.combatTriangleMultiplier
            );

            explain.equation = equation;
            explain.vars = vars;
            explain.simpleExplanation = WidMonsterUtil.maxHitEquationSimple(
                this.name,
                this.monsterId,
                this.afflictionFactor,
                this.specialAttackMaxHit, 
                this.conditionDamageMultiplier, 
                this.safetyFactor, 
                this.monsterPassiveDecreasedPlayerDamageReduction, 
                this._playerDamageReduction, 
                this.combatTriangleMultiplier,
                this.canStun,
                this.canSleep
            );
        }

        return explain;
    }

    getValues() {
        return {
            name: this.name,
            monsterId: this.monsterId,
            canNormalAttack: this.canNormalAttack,
            attackStyle: this.attackStyle,
            canStun: this.canStun,
            canSleep: this.canSleep,
            stunDamageMultiplier: this.stunDamageMultiplier,
            sleepDamageMultiplier: this.sleepDamageMultiplier,
            conditionDamageMultiplier: this.conditionDamageMultiplier,

            damageTakenPerAttackEffect: this.damageTakenPerAttackEffect,
            damageTakenPerAttack: this.damageTakenPerAttack,
            effectiveDamageTakenPerAttack: this.effectiveDamageTakenPerAttack,
            monsterPassiveDecreasedPlayerDamageReduction: this.monsterPassiveDecreasedPlayerDamageReduction,

            combatTriangleMultiplier: this.combatTriangleMultiplier,

            specialAttackChanceTotal: this.specialAttackChanceTotal,

            normalAttackMaxHit: this.normalAttackMaxHit,
            effectiveNormalAttackMaxHit: this.effectiveNormalAttackMaxHit,

            specialAttackMaxHit: this.specialAttackMaxHit,
            effectiveSpecialAttackMaxHit: this.effectiveSpecialAttackMaxHit,
            maxHittingSpecialAttack: this.maxHittingSpecialAttack.specialAttackName,
            effectiveMaxHittingSpecialAttack: this.effectiveMaxHittingSpecialAttack.specialAttackName,

            maxHit: this.maxHit,
            effectiveMaxHit: this.effectiveMaxHit,

            increasedMaxHitPercentModifier: this.increasedMaxHitPercentModifier,
            increasedMaxHitFlatModifier: this.increasedMaxHitFlatModifier,
            decreasedMaxHitpointsModifier: this.decreasedMaxHitpointsModifier,
            decreasedDamageReductionModifier: this.decreasedDamageReductionModifier
        };
    }

    _computeStandardDamageReduction() {
        let reduction = this.dummyPlayer.equipmentStats.damageReduction;
		// 
        reduction += this.dummyPlayer.stats.getResistance(game.damageTypes.getObjectSafe("melvorD:Normal"))
        reduction *= 1 + (this.dummyPlayer.modifiers.increasedDamageReductionPercent - this.dummyPlayer.modifiers.decreasedDamageReductionPercent) / 100;

        if (this.dummyPlayer.modifiers.halveDamageReduction > 0)
            reduction *= 0.5;

        reduction = Math.floor(reduction);
        return WidMonsterUtil.clampValue(reduction, 0, 95);
    }

    _slayerNegationForAreaEffect(effect) {
        const effectValue = effect - 
        this.dummyPlayer.modifiers.increasedSlayerAreaEffectNegationFlat + 
        this.dummyPlayer.modifiers.decreasedSlayerAreaEffectNegationFlat;

        return Math.max(effectValue, 0);
    }

    _specialAttackDamage(attack) {
        let calcDamage = 0;

        attack.damage.forEach((damage)=>{
            const dmg = this._getMaxDamage(damage);

            if(attack.id === "melvorF:SavageSpike") {
                calcDamage += dmg;
            } else {
                if(dmg > calcDamage)
                    calcDamage = dmg;
            }
        });
        
        return calcDamage;
    }

    _getMaxDamage(damage) {
        let character;

        switch (damage.character) {
            // Monster
            case 'Attacker':
                character = this._getCharacter('monster');
                break;
            // Player
            case 'Target':
                character = this._getCharacter('player');
                break;
            default:
                throw new Error(`Invalid damage character type: damage.character}`);
        }
        return WidMonsterUtil.damageRoll(character, damage.maxRoll, damage.maxPercent);
    }

    _getCharacter(monsterOrPlayer) {
        if(monsterOrPlayer === 'monster') {
            return {
                maxHitpoints: this.dummyEnemy.stats.maxHitpoints,
                maxHit: this.normalAttackMaxHit,
                levels: this.dummyEnemy.levels,
                damageReduction: this.dummyEnemy.stats.damageReduction || 0,
                hitpointsPercent: 100,
            };
        } else if(monsterOrPlayer === 'player') {
            return {
                maxHitpoints: this.dummyPlayer.stats.maxHitpoints,
                maxHit: this._modifyMaxHit(this.dummyPlayer, this._calculateStandardMaxHit(this.dummyPlayer)),
                levels: this.dummyPlayer.levels,
                damageReduction: this._playerDamageReduction,
                hitpointsPercent: 100,
            };
        } else {
            throw new Error(`Invalid character type: ${monsterOrPlayer}`);
        }
    }

    _combatTriangleMultiplier() {
        const reductions = this.dummyPlayer.manager.combatTriangle.reductionModifier;
        return reductions[this._playerAttackStyle][this.attackStyle];
    }

    _calculateStandardMaxHit(character) {
        const maxHit = character instanceof Player ? this._calculateStandardMaxHitPlayer(this._playerAttackStyle) : this._calculateStandardMaxHitMonster(this.attackStyle);
        return maxHit;
    }

    _calculateStandardMaxHitPlayer(style) {
        const player = this.dummyPlayer;
        let strengthBonus = 0;
        let twoHandModifier = 1;
        let modifier = null;
        let effectiveLevel = 0;

        switch (style) 
        {
            case 'magic':
                let _a;
                if (player.spellSelection.ancient !== undefined) {
                    return numberMultiplier * player.spellSelection.ancient.specialAttack.damage[0].maxPercent;
                }
                const spell = (_a = player.spellSelection.standard) !== null && _a !== void 0 ? _a : player.spellSelection.archaic;
                if (spell !== undefined) {
                    let damageBonus = player.equipmentStats.magicDamageBonus;
                    damageBonus = this._applyModifier(damageBonus, player.modifiers.magicDamageModifier);
                    return Math.floor(numberMultiplier * spell.maxHit * (1 + damageBonus / 100) * (1 + (player.levels.Magic + 1) / 200));
                } else {
                    return 0;
                }
            case 'ranged':
                strengthBonus = player.equipmentStats.rangedStrengthBonus + player.modifiers.increasedFlatRangedStrengthBonus;
                twoHandModifier = 1;

                if (player.equipment.isWeapon2H)
                    twoHandModifier = 2;

                strengthBonus += (player.modifiers.increasedFlatMeleeStrengthBonusPerAttackInterval - player.modifiers.decreasedFlatMeleeStrengthBonusPerAttackInterval) * Math.floor(player.stats.attackInterval / 100) * twoHandModifier;
                modifier = player.modifiers.rangedStrengthBonusModifier;

                const weaponID = player.equipment.slots.Weapon.item.id;

                if ((this.dummyMonster.canSlayer /*|| player.manager.areaType === CombatAreaType.Slayer*/) && weaponID === "melvorF:Slayer_Crossbow")
                    modifier += 33;
                if (weaponID === "melvorF:Stormsnap") {
                    strengthBonus += Math.floor(129 + (1 + (this.dummyEnemy.levels.Magic * 6) / 33));
                }

                strengthBonus = this._applyModifier(strengthBonus, modifier);
                effectiveLevel = player.levels.Ranged + 9;

                return Math.floor(numberMultiplier * (1.3 + effectiveLevel / 10 + strengthBonus / 80 + (effectiveLevel * strengthBonus) / 640));
            case 'melee':
                strengthBonus = player.equipmentStats.meleeStrengthBonus + player.modifiers.increasedFlatMeleeStrengthBonus;
                twoHandModifier = 1;

                if (player.equipment.isWeapon2H)
                    twoHandModifier = 2;

                strengthBonus += (player.modifiers.increasedFlatMeleeStrengthBonusPerAttackInterval - player.modifiers.decreasedFlatMeleeStrengthBonusPerAttackInterval) * Math.floor(player.stats.attackInterval / 100) * twoHandModifier;
                modifier = player.modifiers.meleeStrengthBonusModifier;
                strengthBonus = this._applyModifier(strengthBonus, modifier);
                effectiveLevel = player.levels.Strength + 9;

                return Math.floor(numberMultiplier * (1.3 + effectiveLevel / 10 + strengthBonus / 80 + (effectiveLevel * strengthBonus) / 640));
            default:
                throw new Error();
        }
    }

    _calculateStandardMaxHitMonster(style) {
        const monster = this.dummyEnemy;
        let effectiveLevel;
        let equipmentbonus;
        let maxHit = 0;

        switch (style) 
        {
            case 'magic':
                let _a;
                if (monster.spellSelection.ancient !== undefined) {
                    return numberMultiplier * monster.spellSelection.ancient.specialAttack.damage[0].maxPercent;
                }
                const spell = (_a = monster.spellSelection.standard) !== null && _a !== void 0 ? _a : monster.spellSelection.archaic;
                if (spell !== undefined) {
                    maxHit = Math.floor(numberMultiplier * spell.maxHit * (1 + monster.equipmentStats.magicDamageBonus / 100) * (1 + (monster.levels.Magic + 1) / 200));
                }
                else {
                    maxHit = 0;
                }
                break;
            case 'ranged':
                effectiveLevel = monster.levels.Ranged + 9;
                equipmentbonus = monster.equipmentStats.rangedStrengthBonus;
                maxHit = Math.floor(numberMultiplier * (1.3 + effectiveLevel / 10 + equipmentbonus / 80 + (effectiveLevel * equipmentbonus) / 640));
                break;
            case 'melee':
                effectiveLevel = monster.levels.Strength + 9;
                equipmentbonus = monster.equipmentStats.meleeStrengthBonus;
                maxHit = Math.floor(numberMultiplier * (1.3 + effectiveLevel / 10 + equipmentbonus / 80 + (effectiveLevel * equipmentbonus) / 640));
                break;
            default:
                throw new Error();
        }

        return maxHit;
    }

    _modifyMaxHit(character, maxHit) {
        const style = character instanceof Player ? this._playerAttackStyle : this.attackStyle;

        if (character.usingAncient) {
            return maxHit;
        }
        let maxHitModifier = this._getMaxHitModifier(character, style);
        if (style === 'magic' && character.spellSelection.standard !== undefined && character.spellSelection.standard.spellTier === SpellTiers.Surge) {
            maxHitModifier += character.modifiers.increasedSurgeSpellMaxHit;
        }
        switch (style) {
        case 'melee':
            maxHitModifier += (character.modifiers.increasedMeleeMaxHitBonusAgainstRanged - character.modifiers.decreasedMeleeMaxHitBonusAgainstRanged) * this._getMaxHitMultiplierBasedOnEnemyAttackType(character);
            break;
        case 'ranged':
            maxHitModifier += (character.modifiers.increasedRangedMaxHitBonusAgainstMagic - character.modifiers.decreasedRangedMaxHitBonusAgainstMagic) * this._getMaxHitMultiplierBasedOnEnemyAttackType(character);
            break;
        case 'magic':
            maxHitModifier += (character.modifiers.increasedMagicMaxHitBonusAgainstMelee - character.modifiers.decreasedMagicMaxHitBonusAgainstMelee) * this._getMaxHitMultiplierBasedOnEnemyAttackType(character);
            break;
        }
        if (true || character.manager.fightInProgress) {
            maxHitModifier += (character.modifiers.increasedMaxHitPercentBasedOnEnemyDamageReduction - character.modifiers.decreasedMaxHitPercentBasedOnEnemyDamageReduction) * character.manager.enemy.stats.damageReduction;
            maxHitModifier += (character.modifiers.increasedMaxHitPercentBasedOnDamageReduction - character.modifiers.decreasedMaxHitPercentBasedOnDamageReduction) * character.stats.damageReduction;
        }
        maxHit = this._applyModifier(maxHit, maxHitModifier);
        maxHit += numberMultiplier * this._getMaxHitFlatModifier(character, style);
        if (style === 'magic' && character.spellSelection.standard !== undefined) {
            maxHit += numberMultiplier * this._getSpellMaxHitModifier(character, character.spellSelection.standard.spellType);
        }

        maxHit = Math.max(maxHit, 1);
        return maxHit;
    }

    _getMaxHitModifier(character, style) {
        let totalBonus = character.modifiers.increasedMaxHitPercent - character.modifiers.decreasedMaxHitPercent;
        switch (style) {
        case 'melee':
            totalBonus += character.modifiers.increasedMeleeMaxHit;
            totalBonus -= character.modifiers.decreasedMeleeMaxHit;
            break;
        case 'ranged':
            totalBonus += character.modifiers.increasedRangedMaxHit;
            totalBonus -= character.modifiers.decreasedRangedMaxHit;
            break;
        case 'magic':
            totalBonus += character.modifiers.increasedMagicMaxHit;
            totalBonus -= character.modifiers.decreasedMagicMaxHit;
            break;
        default:
            throw new Error(`Invalid attack type: ${type} while modifying max hit.`);
        }
        return totalBonus;
    }

    _getMaxHitFlatModifier(character, style) {
        let totalBonus = character.modifiers.increasedMaxHitFlat - character.modifiers.decreasedMaxHitFlat;
        switch (style) {
        case 'melee':
            totalBonus += character.modifiers.increasedMeleeMaxHitFlat;
            totalBonus -= character.modifiers.decreasedMeleeMaxHitFlat;
            break;
        case 'ranged':
            totalBonus += character.modifiers.increasedRangedMaxHitFlat;
            totalBonus -= character.modifiers.decreasedRangedMaxHitFlat;
            break;
        case 'magic':
            totalBonus += character.modifiers.increasedMagicMaxHitFlat;
            totalBonus -= character.modifiers.decreasedMagicMaxHitFlat;
            break;
        default:
            throw new Error(`Invalid attack type: ${type} while calculating flat max hit modifier.`);
        }
        return totalBonus;
    }

    _getSpellMaxHitModifier(character, spellType) {
        switch (spellType) {
        case SpellTypes.Air:
            return character.modifiers.increasedMaxAirSpellDmg - character.modifiers.decreasedMaxAirSpellDmg;
        case SpellTypes.Water:
            return character.modifiers.increasedMaxWaterSpellDmg - character.modifiers.decreasedMaxWaterSpellDmg;
        case SpellTypes.Earth:
            return character.modifiers.increasedMaxEarthSpellDmg - character.modifiers.decreasedMaxEarthSpellDmg;
        case SpellTypes.Fire:
            return character.modifiers.increasedMaxFireSpellDmg - character.modifiers.decreasedMaxFireSpellDmg;
        case SpellTypes.Nature:
            return 0;
        default:
            throw new Error(`Invalid Spelltype: ${spellType}`);
        }
    }

    _getMaxHitMultiplierBasedOnEnemyAttackType(character) {
        let multiplier = 1;
        if (true || character.manager.fightInProgress) {
            const enemyAttackType = character.manager.enemy.attackType;
            switch (enemyAttackType) {
            case 'melee':
                if (this.attackStyle === 'magic')
                    multiplier = 3;
                break;
            case 'ranged':
                if (this.attackStyle === 'melee')
                    multiplier = 3;
                break;
            case 'magic':
                if (this.attackStyle === 'ranged')
                    multiplier = 3;
                break;
            }
        }
        return multiplier;
    }

    _applyModifier(baseStat, modifier, type=0) {
        switch (type) {
        case 0:
            return Math.floor(baseStat * (1 + modifier / 100));
        case 1:
            return baseStat + modifier;
        case 2:
            return Math.floor(baseStat * (1 - modifier / 100));
        case 3:
            return Math.floor(baseStat * (modifier / 100));
        default:
            return baseStat;
        }
    }
}