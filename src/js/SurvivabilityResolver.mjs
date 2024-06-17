import { WIDMonster } from "./widmonster.mjs";
import { WidRenderer } from "./WidRenderer.mjs";

export class SurvabilityResolver {

	ctx = null;
	renderer = null;
	safetyFactor = 1.02;
	skipRequirements = false;
	_debug = false;

    constructor() {

    }

    // Called in setup.mjs, after settings have been created
    _init(ctx) {
        this._ctx = ctx;
        this.renderer = new WidRenderer(this._ctx, this);

        this.safetyFactor = 1 + (ctx.settings.section('Safety').get('safety_factor') / 100);
        this.skipRequirements = ctx.settings.section('Requirements').get('skip_requirements');
        this._debug = ctx.settings.section('Debug').get('debug_mode');
    }

    _log(str, ...args) {
        if(!this._debug) return;
        console.log(str, ...args);
    }

	_checkFightInProgress(msgIfErr) {
		if(game.combat.fightInProgress || game.combat.isActive) {

            this._log(`Will I Die?: Fight in progress, not changing areas`);

            Toastify({
                text: msgIfErr,
                duration: 1500,
                gravity: 'top',
                position: 'center',
                backgroundColor: '#e56767',
                stopOnFocus: false
            }).showToast();

			return true;
        }

		return false;
	}

	setTargetArea(e, areaId, areaType) {
        e.preventDefault(); 
        e.stopPropagation();

        this._log(`Will I Die?: Setting new target area`);

        let areaData = this._getArea(areaType).find(d => d.id === areaId);

        this._log(areaData);

        if(!this.skipRequirements && areaData instanceof Dungeon && areaData.unlockRequirement !== undefined && !game.checkRequirements(areaData.unlockRequirement)) {

            this._log("Will I Die?: Cancelled area target setting - NOT UNLOCKED");

            Toastify({
                text: `Will I Die?: Area is not unlocked`,
                duration: 1500,
                gravity: 'top',
                position: 'center',
                backgroundColor: '#e56767',
                stopOnFocus: false
            }).showToast();

            return;
        }

        if(areaData instanceof SlayerArea) {
            const slayerLevelReq = areaData.slayerLevelRequired;

            if (!this.skipRequirements && !game.checkRequirements(areaData.entryRequirements, false, slayerLevelReq)) {

                this._log("Will I Die?: Cancelled area target setting - FAILED REQUIREMENTS");

                Toastify({
                    text: `Will I Die?: Requirements not met`,
                    duration: 1500,
                    gravity: 'top',
                    position: 'center',
                    backgroundColor: '#e56767',
                    stopOnFocus: false
                }).showToast();
                return;
            }
        }

		if(this._checkFightInProgress(`Will I Die?: Cannot change target area while in combat`)) 
			return;

        const unset = this.renderer._handleTButton(e, "AREA");

        if(unset)
            return;

        this.targetArea = areaData;
        this.recalculateSurvivability("Target area changed", "AREA", areaData);
    }
    
    setTargetMonster(e, areaId, monsterId, areaType) {
        e.preventDefault(); 
        e.stopPropagation();

        this._log(`Will I Die?: Setting new target monster`);

        let areaData = this._getArea(areaType).find(d => d.id === areaId);

		if(areaData instanceof SlayerArea) {
			const slayerLevelReq = areaData.slayerLevelRequired;

			if (!this.skipRequirements && !game.checkRequirements(areaData.entryRequirements, false, slayerLevelReq)) {
				this._log("Will I Die?: Cancelled area target setting - FAILED REQUIREMENTS");
				Toastify({
					text: `Will I Die?: Requirements not met`,
					duration: 1500,
					gravity: 'top',
					position: 'center',
					backgroundColor: '#e56767',
					stopOnFocus: false
				}).showToast();
				return;
			}
		}

		if(this._checkFightInProgress(`Will I Die?: Cannot change target monster while in combat`)) 
			return;

        const unset = this.renderer._handleTButton(e, "MONSTER");

        if(unset)
            return;

        this.recalculateSurvivability("Target area changed", "MONSTER", monsterId, areaData);
    }

    setTargetSlayerTask(e, selectedTier) {
        e.preventDefault(); 
        e.stopPropagation();

        this._log(`Will I Die?: Setting new target slayer task`);

        if(this._checkFightInProgress(`Will I Die?: Cannot change target slayer task while in combat`)) 
			return;

        const monsters = this._getMonsterSelection(selectedTier);

        if(monsters.length === 0) {
            this._log("WillIDie: Cancelled slayer task target setting - FAILED REQUIREMENTS");
            Toastify({
                text: `Will I Die?: Requirements not met for any monster of this tier`,
                duration: 1500,
                gravity: 'top',
                position: 'center',
                backgroundColor: '#e56767',
                stopOnFocus: false
            }).showToast();
            return;
        }

        this._log(monsters);

        const unset = this.renderer._handleTButton(e, "SLAYER");

        if(unset) {
            return;
        }
        
        this.slayerTaskTierSelected = selectedTier;

        this.recalculateSurvivability("Target slayer task changed", "SLAYER", monsters);
    }

	recalculateSurvivability(reason = "", areaOrMonster, target) {

        if(game.combat.fightInProgress || game.combat.isActive) {
            this._log(`Will I Die?: Fight in progress, not calculating survivability (${reason})`);
            this.pendingRecalculation = true;
            this.renderer._reRender();
            return;
        }

        this.currentSurvivabilityState = null;

        if(areaOrMonster === "NONE") {
            this._log(`Will I Die?: Target removed, not calculating survivability`);
            this.renderer._reRender();
            return;
        }

		if(typeof areaOrMonster === 'undefined' || areaOrMonster === null) {
            this._log(`Will I Die?: Target null, not calculating survivability`);
            this.renderer._reRender();
            return;
        }

        const areas = this._getAreas();

        let widMonsters = [];

        if(areaOrMonster === "AREA") {
            widMonsters = target.monsters.map(m => new WIDMonster(m.id, target, this.safetyFactor, this.afflictionFactor));
            this.targetArea = target;
            this.targetMonster = null;
            this.targetSlayerTask = null;
        } else if(areaOrMonster === "MONSTER") {
            const areaForMonster = areas.find(a => a.monsters.find(m => m.id === target))
            widMonsters = [new WIDMonster(target, areaForMonster, this.safetyFactor, this.afflictionFactor)];
            this.targetMonster = target;
            this.targetArea = null;
            this.targetSlayerTask = null;
        } else if(areaOrMonster === "SLAYER") {
            const areaForMonster = areas.find(a => a.monsters.find(m => m.id === target[0].id))
            widMonsters = target.map(m => new WIDMonster(m.id, areaForMonster, this.safetyFactor, this.afflictionFactor));
            this.targetSlayerTask = target;
            this.targetMonster = null;
            this.targetArea = null;
        }

        this.selectedMonsterTab = 0;

        this._log(`Will I Die?: Recalculating survivability (${reason})`);

        this.targetType = areaOrMonster;

        if(this.targetType === "SLAYER" && this.integrateSemiAutoSlayer && mod.api.SEMIAutoSlayer !== undefined) {
            this._log(`Will I Die?: SEMI Auto Slayer integration is enabled and possible, filtering out monsters that are blocked in the SEMI Auto Slayer task list`);
            const blockedBySemi = mod.api.SEMIAutoSlayer.getMonsterStates();
            widMonsters = widMonsters.filter(m => blockedBySemi[m.monsterId] === undefined || blockedBySemi[m.monsterId] !== 1);
        }

        if(widMonsters.length === 0) {
            this._log(`Will I Die?: No monsters left after filtering, not recalculating survivability`);
            this.currentSurvivabilityState = null;
            this.survivabilityStateError = 1;
            this.renderer._reRender();
            return;
        }

        this.survivabilityStateError = 0;

        widMonsters.sort((a, b) => b.effectiveMaxHit - a.effectiveMaxHit);
        const mostDangerousMonster = widMonsters[0];

        const area = areas.find(a => a.monsters.find(m => m.id === mostDangerousMonster.monsterId));
        
        this._debugValues.monsters = widMonsters;
        this._debugValues.mostDangerousMonster = mostDangerousMonster;
        this._debugValues.player.damageReduction = mostDangerousMonster._playerDamageReduction;

        this._updateSurvivabilityState(mostDangerousMonster, area, widMonsters, areaOrMonster);
        this.pendingRecalculation = false;
        this.renderer._reRender();
    }

	_getAreas() {
		if(this.areasCache !== null) return this.areasCache;

		const areasRoot = game.combatAreaCategories.allObjects;
		const areas = [];

		areasRoot.forEach(a => {
			areas.push(...[...a.areas]);
		})

		this.areasCache = areas;

		return areas;
	}

	_getArea(type) {

		let areaRoot = null;

		switch(type) {
			case "combat":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'CombatAreas')
				break;
			case "dungeon":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'Dungeons')
				break;
			case "slayer":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'SlayerAreas')
				break;
			case "stronghold":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'Strongholds')
				break;
			case "abyssalcombat":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'AbyssalCombatAreas')
				break;
			case "abyssalslayer":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'AbyssalSlayerAreas')
				break;
			case "abyssalstronghold":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'AbyssalStrongholds')
				break;	
			case "abyss":
				areaRoot = game.combatAreaCategories.allObjects.find(a => a._localID === 'TheAbyss')
				break;
			default:
				break;
		}

		if(!areaRoot) {
			this._log(`Will I Die?: _getArea() areaRoot was null!`);
			return [];
		}

		const areas = [...[...areaRoot.areas]];

		return areas;
	}

    _getMonsterSelection(tier) {

        const data = SlayerTask.data[tier];

        return game.monsters.filter((monster)=>{
            const combatLevel = monster.combatLevel;
            const monsterArea = game.getMonsterArea(monster);
            let slayerLevelReq = 0;

            if (monsterArea instanceof SlayerArea)
                slayerLevelReq = monsterArea.slayerLevelRequired;

            return (monster.canSlayer && combatLevel >= data.minLevel && combatLevel <= data.maxLevel && game.combat.slayerTask.checkRequirements(monsterArea.entryRequirements, false, slayerLevelReq));
        }
        );
    }

    _getAutoEatThreshold(maxHealthReduction = 1) {
        let percent = game.combat.player.modifiers.increasedAutoEatThreshold - game.combat.player.modifiers.decreasedAutoEatThreshold;
        percent = Math.min(100, percent);

        let maxHitpoints = game.combat.player.stats.maxHitpoints;
        maxHitpoints = maxHitpoints * maxHealthReduction;

        return (maxHitpoints * percent) / 100;
    }

    _updateSurvivabilityState(monster, area, widMonsters, areaOrMonster) {
        if(this._debug)
            this._debugValues.mostDangerousMonster = monster;

        const autoEatThreshold = this._getAutoEatThreshold(monster.decreasedMaxHitpointsModifier);
        const normalAutoEatThreshold = this._getAutoEatThreshold();

        const playerIsWorseThanEnemy = monster.effectiveDamageTakenPerAttack > monster.effectiveMaxHit;
        const playerCanKillSelf = (monster.effectiveDamageTakenPerAttack >= autoEatThreshold && playerIsWorseThanEnemy);

        this.currentSurvivabilityState = {
            ...this.currentSurvivabilityState,
            playerIsWorseThanEnemy,
            playerCanKillSelf,
            maxHit: monster.maxHit,
            effectiveMaxHit: monster.effectiveMaxHit,
            maxHitReason: monster.whatMakesMeDangerous(),
            canDie: monster.effectiveMaxHit >= autoEatThreshold,
            autoEatThreshold,
            normalAutoEatThreshold,
            playerSelfHit: monster.effectiveDamageTakenPerAttack,
            monster: monster
        }

        if(area && widMonsters) {
            const areaName = area ? area.name : "Unknown";

            const uniqueMonsters = widMonsters.filter((v, i, self) =>
                i === self.findIndex((t) => (
                    t.monsterId === v.monsterId
                ))
            );

            uniqueMonsters.sort((a, b) => b.effectiveMaxHit - a.effectiveMaxHit);
            
            this.currentSurvivabilityState.areaName = areaName;
            this.currentSurvivabilityState.uniqueMonsters = uniqueMonsters;
            this.currentSurvivabilityState.widMonsters = widMonsters;
        }
    }

    getExternalDebugValues() {
        const pack = {
            maxHit: this.currentSurvivabilityState?.maxHit,
            effectiveMaxHit: this.currentSurvivabilityState?.effectiveMaxHit,
            playerSelfHit: this.currentSurvivabilityState?.playerSelfHit,
            autoEatThreshold: this.currentSurvivabilityState?.autoEatThreshold,
            normalAutoEatThreshold: this.currentSurvivabilityState?.normalAutoEatThreshold,
            canDie: this.currentSurvivabilityState?.canDie,
            playerIsWorseThanEnemy: this.currentSurvivabilityState?.playerIsWorseThanEnemy,
            playerCanKillSelf: this.currentSurvivabilityState?.playerCanKillSelf,
            areaName: this.currentSurvivabilityState?.areaName,
            uniqueMonsters: this.currentSurvivabilityState?.uniqueMonsters.map(m => m.monsterId),
            widMonsters: this.currentSurvivabilityState?.widMonsters.map(m => m.monsterId),
            targetArea: this.targetArea?.id,
            selectedMonsterTab: this.selectedMonsterTab ?? null,
            pendingRecalculation: this.pendingRecalculation ?? null,
            targetType: this.targetType ?? null,
            afflictionFactor: this.afflictionFactor ?? null,
            safetyFactor: this.safetyFactor ?? null,
            skipRequirements: this.skipRequirements ?? null,
            showCalculations: this.showCalculations ?? null,
            showSimpleCalculations: this.showSimpleCalculations ?? null,
            integrateSemiAutoSlayer: this.integrateSemiAutoSlayer ?? null,
            slayerTaskTierSelected: this.slayerTaskTierSelected ?? null,
            survivabilityStateError: this.survivabilityStateError ?? null
        }

        let out = "";

        for(const [key, value] of Object.entries(pack)) {
            out += `${key}: ${value}\n`
        }

        const monsterValues = this._debugValues.mostDangerousMonster?.getValues();

        for(const [key, value] of Object.entries(monsterValues)) {
            out += `${key}: ${value}\n`
        }

        for(const [key, value] of Object.entries(this.currentSurvivabilityState?.maxHitReason?.vars)) {
            out += `${key}: description: ${value.description}, name: ${value.name}, intermediary: ${value.intermediary ?? "-"}, value: ${value.value}\n`
        }

        return out;
    }

    _printDebugValues() {
        if(!this._debug) return;

        console.group('WILL I DIE DEBUG VALUES');
        console.log("Target area", this.targetArea);
        console.log("Target Monster", this.targetMonster);
        console.log("Target Slayer Task", this.targetSlayerTask);
        console.log("Target type", this.targetType);
        console.log("Current survivability state", this.currentSurvivabilityState);
        console.log("Monsters", this._debugValues.monsters);
        console.log("Most dangerous monster", this._debugValues.mostDangerousMonster);
        console.log("Player", this._debugValues.player);
        console.log("Safety Factor", this.safetyFactor);
        console.log("Skip Requirements", this.skipRequirements);
        console.log("Pending Recalculation", this.pendingRecalculation);
        console.groupEnd();
    }
}