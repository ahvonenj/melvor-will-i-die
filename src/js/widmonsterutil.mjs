export class WidMonsterUtil {
    static getMonsterSpecificBullshit(monsterId, afflictionFactor) {
        let increasedMaxHitPercentModifier = 0;
        let increasedMaxHitFlatModifier = 0;
        let decreasedMaxHitpointsModifier = 0;
        let decreasedDamageReductionModifier = 0;

        switch(monsterId) {

            case "melvorF:GreaterSkeletalDragon":
                decreasedDamageReductionModifier = 10;
                decreasedMaxHitpointsModifier = afflictionFactor;
            break;

            case "melvorF:Bane":
            case "melvorF:BaneInstrumentOfFear":
                decreasedDamageReductionModifier = 30;
            break;

            case "melvorF:MysteriousFigurePhase1":
            case "melvorF:MysteriousFigurePhase2":
                decreasedDamageReductionModifier = 50;
            break;

            case "melvorTotH:Fiozor":
                decreasedDamageReductionModifier = 15;
                increasedMaxHitFlatModifier = 3 * 15 * numberMultiplier;
            break;

            case "melvorTotH:MonsterCroc":
                increasedMaxHitPercentModifier = 40;
            break;

            case "melvorTotH:VorloranProtector":
                increasedMaxHitPercentModifier = 100;
            break;

            case "melvorTotH:PlagueDoctor":
                decreasedMaxHitpointsModifier = afflictionFactor;
            break;

            case "melvorTotH:TheHeraldPhase1":
                increasedMaxHitPercentModifier = 50;
                decreasedMaxHitpointsModifier = afflictionFactor;
            break;

            case "melvorTotH:TheHeraldPhase2":
            case "melvorTotH:TheHeraldPhase3":
                increasedMaxHitPercentModifier = 50;
            break;

            case "melvorTotH:LightningSpirit":
            case "melvorTotH:LightningMonkey":
            case "melvorTotH:LightningGolem":
            case "melvorTotH:RaZu":
                decreasedDamageReductionModifier = 20;
            break;

            case "melvorTotH:GoliathWerewolf":
                increasedMaxHitPercentModifier = 20;
            break;

            case "melvorTotH:DarkKnight":
                increasedMaxHitPercentModifier = 30;
            break;

            case "melvorTotH:Torvair":
            case "melvorTotH:Arctair":
            case "melvorTotH:Harkair":
                decreasedDamageReductionModifier = 10;
            break;

            default:
                break;
        }

        return {
            increasedMaxHitPercentModifier: 1 + (increasedMaxHitPercentModifier / 100),
            increasedMaxHitFlatModifier,
            decreasedMaxHitpointsModifier: 1 - (decreasedMaxHitpointsModifier / 100),
            decreasedDamageReductionModifier
        }
    }

    static getDamageRelevantHitEffects(availableAttacks) {
        /*let highestMaxHitPercentMod = 0;
        let highestMaxHitFlatMod = 0;
        //let highestDecreasedHitpointsMod = 1;

        const maxHitPercentPrehits = availableAttacks.filter(a => a.attack.prehitEffects.filter((e) => Object.keys(e.modifiers).some(m => m === "increasedMaxHitPercent")).length > 0).map(a => a.attack.prehitEffects);
        const maxHitPercentOnhits = availableAttacks.filter(a => a.attack.prehitEffects.filter((e) => Object.keys(e.modifiers).some(m => m === "increasedMaxHitPercent")).length > 0).map(a => a.attack.onhitEffects);

        [...maxHitPercentPrehits, ...maxHitPercentOnhits].forEach(effects => {
            effects.forEach(effect => {
                if(effect.modifiers.increasedMaxHitPercent > highestMaxHitPercentMod) {
                    highestMaxHitPercentMod = effect.modifiers.increasedMaxHitPercent;
                }
            });
        });

        const maxHitFlatPrehits = availableAttacks.filter(a => a.attack.prehitEffects.filter((e) => Object.keys(e.modifiers).some(m => m === "increasedMaxHitFlat")).length > 0).map(a => a.attack.prehitEffects);
        const maxHitFlatOnhits = availableAttacks.filter(a => a.attack.prehitEffects.filter((e) => Object.keys(e.modifiers).some(m => m === "increasedMaxHitFlat")).length > 0).map(a => a.attack.onhitEffects);

        [...maxHitFlatPrehits, ...maxHitFlatOnhits].forEach(effects => {
            effects.forEach(effect => {
                if(effect.modifiers.increasedMaxHitFlat > highestMaxHitFlatMod) {
                    highestMaxHitFlatMod = effect.modifiers.increasedMaxHitFlat;
                }
            });
        });

        return {
            highestMaxHitPercentMod,
            highestMaxHitFlatMod
        };*/

        //const decreasedHitpointsPrehits = availableAttacks.filter(a => a.attack.prehitEffects.filter((e) => Object.keys(e.modifiers).some(m => m === "decreasedMaxHitpoints")).length > 0).map(a => a.attack.prehitEffects);
        //const decreasedHitpointsOnhits = availableAttacks.filter(a => a.attack.prehitEffects.filter((e) => Object.keys(e.modifiers).some(m => m === "decreasedMaxHitpoints")).length > 0).map(a => a.attack.onhitEffects);
    }

    static maxHitEquationHTML(monsterId, afflictionFactor, maxHit, totalDamageMultiplier, safetyFactor, monsterPassiveDecreasedPlayerDamageReduction, playerDamageReduction, combatTriangleMultiplier) {

        const {
            increasedMaxHitPercentModifier,
            increasedMaxHitFlatModifier,
            decreasedMaxHitpointsModifier,
            decreasedDamageReductionModifier
        } = WidMonsterUtil.getMonsterSpecificBullshit(monsterId, afflictionFactor);

        const dmgs = ((((maxHit + increasedMaxHitFlatModifier) * totalDamageMultiplier * safetyFactor * increasedMaxHitPercentModifier) + Number.EPSILON) * 100) / 100;
        
        const pred = playerDamageReduction - monsterPassiveDecreasedPlayerDamageReduction - decreasedDamageReductionModifier;

        const predClamped = pred < 0 ? 0 : pred;

        const reds = Math.floor(((Math.floor(predClamped * combatTriangleMultiplier) / 100) + Number.EPSILON) * 100) / 100;
        const effective = Math.floor(dmgs * (1 - reds));

        const vars = {
            "cr-eq-var-1":  { description: "Max hit", name: "MH", value: maxHit },
            "cr-eq-var-2":  { description: "Cond. dmg +% (stun etc.)", name: "CD", value: totalDamageMultiplier },
            "cr-eq-var-3":  { description: "Safety factor", name: "SF", value: safetyFactor },
            "cr-eq-var-4":  { description: "Decreased DR", name: "DDR", value: monsterPassiveDecreasedPlayerDamageReduction },
            "cr-eq-var-5":  { description: "Player DR", name: "PDR", value: playerDamageReduction },
            "cr-eq-var-11":  { description: "Monster Inc. flat max hit mod.", name: "MFMH", value: increasedMaxHitFlatModifier },
            "cr-eq-var-12":  { description: "Monster Inc. % max hit mod.", name: "MPMH", value: increasedMaxHitPercentModifier },
            "cr-eq-var-13":  { description: "Monster Dec. % DR mod.", name: "MDDR", value: decreasedDamageReductionModifier },
            "cr-eq-var-6":  { description: "Combat triangle", name: "CBT", value: combatTriangleMultiplier },
            "cr-eq-var-14":  { description: "DR after reduction", name: "DRR", intermediary: 'PDR - DDR - MDDR', value: pred },
            "cr-eq-var-8":  { description: "Clamped DR", name: "DRC", intermediary: 'DRR < 0 ? 0 : DRR', value: predClamped },
            "cr-eq-var-7":  { description: "Total dmg", name: "TDMG", intermediary: '(MH + MFMH) * CD * SF * MPMH', value: dmgs },
            "cr-eq-var-9":  { description: "Final DR", name: "FDR", intermediary: 'Math.floor(DRR * CBT) / 100', value: reds },
            "cr-eq-var-10": { description: "Effective max hit", name: "EFMH", intermediary: 'Math.round(TDMG * (1 - (FDR))', value: effective }
        }

        return [`<div class = "cr-eq-container">` + 
        `<span class = "cr-eq-var cr-eq-var-1">MH</span> = <span class = "cr-eq-val">${maxHit}</span><br/>` +
        `<span class = "cr-eq-var cr-eq-var-2">CD</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${totalDamageMultiplier}</span><br/>` +
        `<span class = "cr-eq-var cr-eq-var-3">SF</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${safetyFactor}</span><br/>` +
        `<span class = "cr-eq-var cr-eq-var-4">DDR</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${monsterPassiveDecreasedPlayerDamageReduction}</span><br/>` +
        `<span class = "cr-eq-var cr-eq-var-5">PDR</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${playerDamageReduction}</span><br/>` +   
        `<span class = "cr-eq-var cr-eq-var-11">MFMH</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${increasedMaxHitFlatModifier}</span><br/>` +   
        `<span class = "cr-eq-var cr-eq-var-12">MPMH</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${increasedMaxHitPercentModifier}</span><br/>` +   
        `<span class = "cr-eq-var cr-eq-var-13">MDDR</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${decreasedDamageReductionModifier}</span><br/>` +   
        `<span class = "cr-eq-var cr-eq-var-6">CBT</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-val">${combatTriangleMultiplier}</span><br/>` +
        `<span class = "cr-eq-var cr-eq-var-14">DRR</span><span class = "cr-eq-calc"> = </span><span class = "cr-eq-var cr-eq-var-5">PDR</span> - <span class = "cr-eq-var cr-eq-var-4">DDR</span> - <span class = "cr-eq-var cr-eq-var-13">MDDR</span> = </span><span class = "cr-eq-val">${pred}</span><br/>` +
        `<span class = "cr-eq-var cr-eq-var-8">DRC</span><span class = "cr-eq-calc"> = <span class = "cr-eq-var cr-eq-var-14">DRR</span> < 0 ? 0 : <span class = "cr-eq-var cr-eq-var-14">DRR</span> = </span><span class = "cr-eq-val">${predClamped}</span><br/><br/>` +
        `<span class = "cr-eq-var cr-eq-var-7">TDMG</span><span class = "cr-eq-calc"> = (<span class = "cr-eq-var cr-eq-var-1">MH</span> + <span class = "cr-eq-var cr-eq-var-11">MFMH</span>) * <span class = "cr-eq-var cr-eq-var-2">CD</span> * <span class = "cr-eq-var cr-eq-var-3">SF</span> * <span class = "cr-eq-var cr-eq-var-12">MPMH</span> = </span><span class = "cr-eq-val">${dmgs}</span><br/><br/>` +
        `<span class = "cr-eq-var cr-eq-var-9">FDR</span><span class = "cr-eq-calc"> = Math.floor(<span class = "cr-eq-var cr-eq-var-8">DRR</span> * <span class = "cr-eq-var cr-eq-var-6">CBT</span>) / 100) = </span><span class = "cr-eq-val">${reds}</span><br/><br/>` +
        `<span class = "cr-eq-var cr-eq-var-10">EFMH</span><span class = "cr-eq-calc"> = Math.round(<span class = "cr-eq-var cr-eq-var-7">TDMG</span> * (1 - (<span class = "cr-eq-var cr-eq-var-9">FDR</span>)) = </span><span class = "cr-eq-val">${effective}</span>` +
        `</div>`, vars];
    }

    static clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static damageRoll(character, type, percent) {
        let value = 0;
        
        switch (type) {
            case 'CurrentHP':
                value = character.maxHitpoints;
                break;
            case 'MaxHP':
                value = character.maxHitpoints;
                break;
            case 'DamageDealt':
                value = 0;
                break;
            case 'MaxHit':
                value = character.maxHit;
                break;
            case 'MinHit':
                value = 0;
                break;
            case 'Fixed':
                return percent * numberMultiplier;
            case 'MagicScaling':
                value = (character.levels.Magic + 1) * numberMultiplier;
                break;
            case 'One':
                return 1;
            case 'Rend':
                percent = 250;
                value = damageDealt;
                break;
            case 'Poisoned':
                return numberMultiplier * percent;
            case 'Bleeding':
                return numberMultiplier * percent;
            case 'PoisonMin35':
                value = 0;
                break;
            case 'PoisonMax35':
                value = character.maxHit;
                percent += 35;
                break;
            case 'PoisonFixed100':
                value = numberMultiplier * percent;
                value *= 2;
                return value;
            case 'BurnFixed100':
                value = numberMultiplier * percent;
                value *= 2;
                return value;
            case 'BurnMaxHit100':
                value = character.maxHit;
                percent += 100;
                break;
            case 'CursedFixed100':
                value = numberMultiplier * percent;
                value *= 2;
                return value;
            case 'MaxHitDR':
                value = character.maxHit;
                percent += character.damageReduction;
                break;
            case 'MaxHitScaledByHP':
                value = (character.maxHit * character.hitpointsPercent) / 100;
                break;
            case 'MaxHitScaledByHP2x':
                value = (character.maxHit * (character.hitpointsPercent * 2)) / 100;
                break;
            case 'FixedPlusMaxHit50':
                return numberMultiplier * percent + character.maxHit / 2;
            case 'HPUnder90':
                if (character.hitpointsPercent <= 90)
                    return numberMultiplier * percent;
                else
                    return 0;
            case 'PoisonedMaxHit':
                value = character.maxHit;
                break;
            default:
                throw new Error(`Invalid damage type: ${type}`);
        }

        return Math.floor((value * percent) / 100);
    }
}