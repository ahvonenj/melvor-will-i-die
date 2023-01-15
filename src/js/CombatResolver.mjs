import { WIDMonster } from "./widmonster.mjs";

export class CombatResolver {

    targetArea = null;
    targetMonster = null;
    targetSlayerTask = null;
    currentSurvivabilityState = null;
    survivabilityStateError = 0;
    targetType = null;
    
    tabComponent = null; 
    tabButton = null;
    tabContent = null;
    safetyFactorElement = null;
    semiIntegrationElement = null;
    monsterTabContainer = null;
    equationPopup = null;

    safetyFactor = 1.02;
    afflictionFactor = 20;
    skipRequirements = false;
    showCalculations = false;
    integrateSemiAutoSlayer = false;

    pendingRecalculation = false;

    selectedMonsterTab = 0;
    slayerTaskTierSelected = null;
    
    headerComponentCreated = false;
    _debug = false;

    _ctx = null;

    _tabOpen = false;

    _debugValues = {
        monsters: [],
        mostDangerousMonster: null,
        player: {
            damageReduction: 0
        }
    }

    _monsterTabTippys = [];

    constructor() {

    }

    // Called in setup.mjs, after settings have been created
    _init(ctx) {
        this._ctx = ctx;
        this.safetyFactor = 1 + (ctx.settings.section('Safety Factor').get('safety_factor') / 100);
        this.skipRequirements = ctx.settings.section('Requirements').get('skip_requirements');
        this._debug = ctx.settings.section('Debug').get('debug_mode');
    }

    _log(str, ...args) {
        if(!this._debug) return;
        console.log(str, ...args);
    }

    _createHeaderComponent() {
        if(this.headerComponentCreated) return;

        this._log(`WillIDie: Creating header component`);

        // We want to append our own header tab after equipment tab in the header
        const targetTab = document.querySelector('#page-header-equipment-dropdown').parentElement;

        if(!targetTab) {
            console.error(`WillIDie: COULD NOT CREATE HEADER COMPONENT`);
            return;
        }

        // EQUATION POPUP STUFF
        const equationPopupVarName = createElement('div', { id: "will-i-die-equation-popup-name" });
        const equationPopupVarIntermediary = createElement('div', { id: "will-i-die-equation-popup-intermediary" });
        const equationPopupVarValue = createElement('div', { id: "will-i-die-equation-popup-value" });
        const equationPopupVarDescription = createElement('div', { id: "will-i-die-equation-popup-desc" });
        const equationPopup = createElement('div', { id: "will-i-die-equation-popup", classList: ["wid-eq-popup-invisible"] });

        equationPopup.appendChild(equationPopupVarName);
        equationPopup.appendChild(equationPopupVarIntermediary);
        equationPopup.appendChild(equationPopupVarValue);
        equationPopup.appendChild(equationPopupVarDescription);
        document.body.appendChild(equationPopup);
        this.equationPopup = equationPopup;
        // ! EQUATION POPUP STUFF !

        // Tab element
        this.tabComponent = createElement('div', {
            id: "will-i-die-header-tab",
            classList: ["dropdown", "d-inline-block", "ml-2"]
        });

        // Button element for the tab
        const tabButton = createElement('button', {
            id: "will-i-die-header-tab-btn",
            classList: ["btn", "btn-sm", "btn-dual"],
            attributes: [['data-toggle', 'dropdown']]
        });

        tabButton.onclick = () => {
            this._tabOpen = true;
        }

        this.tabButton = tabButton;

        this.tabComponent.appendChild(this.tabButton);

        // Dropdown for when the tab is clicked
        const dropdown = createElement('div', {
            id: "will-i-die-header-tab-dropdown",
            classList: ["dropdown-menu", "dropdown-menu-lg", "dropdown-menu-right", "p-0", "border-0", "font-size-sm"]
        });

        const header = createElement('div', {
            classList: ["dropdown-header"]
        });

        const header_left = createElement('div', {
            classList: ["dropdown-header-left"],
            text: "Will I Die?"
        });

        const header_right = createElement('div', {
            classList: ["dropdown-header-right"]
        });

        this.safetyFactorElement = createElement('div', {
            classList: ["wid-safety-factor"],
            text: `Safety Factor: ${this.safetyFactor}x`
        });

        this.semiIntegrationElement = createElement('div', {
            classList: ["wid-semi-integrated"],
            text: this.integrateSemiAutoSlayer ? "Integrated with SEMI" : ""
        });

        this.monsterTabContainer = createElement('div', {
            classList: ["wid-monster-tabs"]
        });

        this.monsterTabContainer.onclick = (e) => {
            if(e.target.classList.contains('wid-monster-tab')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleMonsterTabClick(e);
            }
        }

        header_left.onclick = () => {
            this._printDebugValues();
        }

        header_right.appendChild(this.safetyFactorElement)
        header_right.appendChild(this.semiIntegrationElement)

        header.appendChild(header_left);
        header.appendChild(header_right);

        dropdown.appendChild(createElement('div', {
            classList: ["p-2", "text-center"]
        }).appendChild(header));

        this.tabContent = createElement('div', {
            classList: ["block-content", "block-content-full", "pt-0", "combat-resolver-tab-content"]
        });

        this.tabContent.onmouseover = (e) => {
            if(!this.currentSurvivabilityState)
                return;

            if(e.target.classList.contains('cr-eq-var')) {
                const equationId = Array.from(e.target.classList).find(c => c.indexOf('cr-eq-var') > -1 && c.length > 9);
                
                const vars = this.currentSurvivabilityState.maxHitReason.vars[equationId];
                const name = vars.name;
                const value = vars.value;
                const intermediary = vars.intermediary ? ` = ${vars.intermediary} = ` : ' = ';
                const description = vars.description;

                this.equationPopup.children[0].innerText = name;
                this.equationPopup.children[1].innerText = intermediary;
                this.equationPopup.children[2].innerText = value;
                this.equationPopup.children[3].innerText = ` (${description})`;

                this.equationPopup.classList.remove('wid-eq-popup-invisible');
                this.equationPopup.style.top = `${e.clientY - (this.equationPopup.offsetHeight) - 10}px`;
                this.equationPopup.style.left = `${e.clientX - (this.equationPopup.offsetWidth / 2)}px`;
            }
        }

        this.tabContent.onmouseout = (e) => {
            const targetClasses = Array.from(e.target.classList);
            const targetClassesFilter = targetClasses.filter(c => c.indexOf('cr-eq-var') > -1);

            if(targetClassesFilter.length > 0) {
                this.equationPopup.classList.add('wid-eq-popup-invisible');
            }
        }

        dropdown.appendChild(this.monsterTabContainer);
        dropdown.appendChild(this.tabContent);
        this.tabComponent.appendChild(dropdown);
        targetTab.after(this.tabComponent);

        this.headerComponentCreated = true;

        this._reRender();
    }

    _fastResetTabContents() {
        if(!this._tabOpen) return;
        if(!this.currentSurvivabilityState) return;

        const mostDangerousMonster = this.currentSurvivabilityState.uniqueMonsters[0];

        if(!mostDangerousMonster) return;

        this._updateSurvivabilityState(mostDangerousMonster);

        this._tabOpen = false;
        this.selectedMonsterTab = 0;
        this._reRender();
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

    _reRenderSafetyFactor() {
        this.safetyFactorElement.innerHTML = `Safety Factor: ${this.safetyFactor}x`;

        this.safetyFactorElement.classList.remove('wid-safety-factor-warning');
        this.safetyFactorElement.classList.remove('wid-safety-factor-danger');

        if(this.safetyFactor < 1.05) {
            this.safetyFactorElement.classList.add('wid-safety-factor-danger');
        } else if(this.safetyFactor < 1.07) {
            this.safetyFactorElement.classList.add('wid-safety-factor-warning');
        }
    }

    _reRenderIntegration() {
        if(!this.integrateSemiAutoSlayer) {
            this.semiIntegrationElement.classList.add('wid-semi-integration-disabled');
        } else {
            this.semiIntegrationElement.classList.remove('wid-semi-integration-disabled');
        }
    }

    _reRenderMonsterTabs() {
        if(!this.currentSurvivabilityState) {
            this.monsterTabContainer.classList.add('wid-monster-tabs-invisible');
            return;
        }

        this._monsterTabTippys.forEach(t => t.destroy());

        this.monsterTabContainer.classList.remove('wid-monster-tabs-invisible');
        
        const buttons = [];

        let i = 1;

        for(const widMonster of this.currentSurvivabilityState.uniqueMonsters) {
            if(i > 6) break;

            const active = this.selectedMonsterTab === i-1 ? 'wid-monster-tab-active' : '';
            const classes = active ? ["wid-monster-tab", "wid-monster-tab-active"] : ["wid-monster-tab"];

            const button = createElement('div', {
                classList: classes
            });

            // TODO: Somehow don't render monster image if player is worse
            button.style.backgroundImage =  `url('${widMonster.media}')`;
            button.dataset.index = i - 1;

            const tip = tippy(button, {
                content: widMonster.name,
                placement: 'left',
                allowHTML: false,
                interactive: false,
                animation: false,
                touch: 'hold'
            });

            this._monsterTabTippys.push(tip);
            buttons.push(button);
            i++;
        }

        this.monsterTabContainer.replaceChildren(...buttons);
    }

    // Rerenders all the DOM elements related to this mod with new values
    _reRender() {
        if(!this.headerComponentCreated) return;

        this._log(`WillIDie: Rerendering`);

        if(this.survivabilityStateError === 1) {
            this.tabButton.textContent = "?";
            this.tabButton.classList.remove('combat-resolver-safe');
            this.tabButton.classList.remove('combat-resolver-danger');
            this.tabButton.classList.add('combat-resolver-unknown');

            this.tabContent.innerHTML = `WillIDie is currently unable to calculate your survivability.<br/><br/>
            This is likely due to trying to target a slayer tier with SEMI Auto Slayer integration enabled,
            but your current task block list is filtering out all tasks in that tier.<br/><br/>`;

            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
            return;
        }

        // No area target selected or some other issue - can't tell if safe or not so we render ?
        if(!this.currentSurvivabilityState) {
            this.tabButton.textContent = "?";
            this.tabButton.classList.remove('combat-resolver-safe');
            this.tabButton.classList.remove('combat-resolver-danger');
            this.tabButton.classList.add('combat-resolver-unknown');

            this.tabContent.innerHTML = `Got to the Combat Area Selection page to first set a combat area target for WillIDie.<br/><br/>
            After you have set the combat area target, WillIDie will begin to calculate whether you will live or die 
            when idling in the selected area, based on your current gear and statistics.`;

            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
            return;
        }

        const { 
            canDie, 
            maxHitReason, 
            maxHit,
            effectiveMaxHit,
            autoEatThreshold,
            areaName,
            playerIsWorseThanEnemy,
            playerCanKillSelf,
            playerSelfHit,
            normalAutoEatThreshold,
            widMonsters
        } = this.currentSurvivabilityState;

        const numberOrderStrings = ['', 'second ', 'third ', 'fourth ', 'fifth ', 'sixth ', 'seventh ', 'eighth ', 'ninth ', 'tenth '];

        const afflictionMessage = maxHitReason.affliction.canAfflict ? `WARNING - 
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> is able to cast 
                <span class = "cr-hl cr-hl-spec">AFFLICTION</span>, reducing your auto eat treshold from 
                <span class = "cr-hl cr-hl-health">${normalAutoEatThreshold}</span> to 
                <span class = "cr-hl cr-hl-dmg">${autoEatThreshold}</span><br/><br/>` : "";

        if(canDie || playerCanKillSelf) {
            this.tabButton.textContent = "DANGER";
            this.tabButton.classList.remove('combat-resolver-unknown');
            this.tabButton.classList.remove('combat-resolver-safe');
            this.tabButton.classList.remove('combat-resolver-recalc');
            this.tabButton.classList.add('combat-resolver-danger');

            if(this.pendingRecalculation) {
                this.tabButton.classList.add('combat-resolver-recalc');
            }

            if(playerIsWorseThanEnemy) {
                this.tabContent.innerHTML = `<span class = "cr-hl cr-hl-warn">YOU COULD DIE.</span><br/><br/>
                In the ${numberOrderStrings[this.selectedMonsterTab]}worst case, a player named 
                <span class = "cr-hl cr-hl-enemy">${game.characterName}</span> in 
                <span class = "cr-hl cr-hl-area">their gaming chair</span> could hit themselves for 
                <span class = "cr-hl cr-hl-dmg">${playerSelfHit}</span>.<br/><br/>As
                <span class = "cr-hl cr-hl-dmg">${playerSelfHit}</span> is greater than your auto-eat threshold of 
                <span class = "cr-hl cr-hl-health">${autoEatThreshold}</span>,
                <span class = "cr-hl cr-hl-enemy">this silly mistake</span> could kill you.`;
            } else {

                this.tabContent.innerHTML = `<span class = "cr-hl cr-hl-warn">YOU COULD DIE.</span><br/><br/>
                In the ${numberOrderStrings[this.selectedMonsterTab]}worst case, a monster named 
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> in 
                <span class = "cr-hl cr-hl-area">${areaName}</span> could perform 
                <span class = "cr-hl cr-hl-spec">${maxHitReason.bestAttackName}</span> (<span class = "cr-hl cr-hl-style-${maxHitReason.attackStyle}">${maxHitReason.attackStyle}</span>) and hit you for 
                <span class = "cr-hl cr-hl-dmg">${effectiveMaxHit}</span> after damage reduction.<br/><br/>As
                <span class = "cr-hl cr-hl-dmg">${effectiveMaxHit}</span> is greater than your auto-eat threshold of 
                <span class = "cr-hl cr-hl-health">${autoEatThreshold}</span>,
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> could kill you.<br/><br/>` +
                afflictionMessage +
                `${this.showCalculations ? maxHitReason.equation : ''}`;
            }
            
            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
        }
        else {
            this.tabButton.textContent = "SAFE";
            this.tabButton.classList.remove('combat-resolver-unknown');
            this.tabButton.classList.remove('combat-resolver-danger');
            this.tabButton.classList.remove('combat-resolver-recalc');
            this.tabButton.classList.add('combat-resolver-safe');

            if(this.pendingRecalculation) {
                this.tabButton.classList.remove('combat-resolver-safe');
                this.tabButton.classList.add('combat-resolver-recalc');

                this.tabContent.innerHTML = `<span class = "cr-hl combat-resolver-recalc">PENDING RECALCULATION.</span><br/><br/>
                In the ${numberOrderStrings[this.selectedMonsterTab]}worst case, a monster named 
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> in 
                <span class = "cr-hl cr-hl-area">${areaName}</span> could perform 
                <span class = "cr-hl cr-hl-spec">${maxHitReason.bestAttackName}</span> (<span class = "cr-hl cr-hl-style-${maxHitReason.attackStyle}">${maxHitReason.attackStyle}</span>) and hit you for 
                <span class = "cr-hl cr-hl-dmg">${effectiveMaxHit}</span> after damage reduction.<br/><br/>As
                <span class = "cr-hl cr-hl-dmg">${effectiveMaxHit}</span> is less than your auto-eat threshold of 
                <span class = "cr-hl cr-hl-health">${autoEatThreshold}</span>,
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> shouldn't be able to kill you.<br/><br/>` +
                afflictionMessage +
                `<span class = "cr-hl-warn">THESE VALUES MIGHT NOT BE CORRECT, BECAUSE RECALCULATION IS NEEDED.</span><br/><br/>
                <span class = "cr-hl-warn">LEAVE COMBAT TO RECALCULATE SURVIVABILITY</span>`;
            } else {
                this.tabContent.innerHTML = `<span class = "cr-hl cr-hl-ok">YOU SHOULD BE SAFE.</span><br/><br/>
                In the ${numberOrderStrings[this.selectedMonsterTab]}worst case, a monster named 
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> in 
                <span class = "cr-hl cr-hl-area">${areaName}</span> could perform 
                <span class = "cr-hl cr-hl-spec">${maxHitReason.bestAttackName}</span> (<span class = "cr-hl cr-hl-style-${maxHitReason.attackStyle}">${maxHitReason.attackStyle}</span>) and hit you for 
                <span class = "cr-hl cr-hl-dmg">${effectiveMaxHit}</span> after damage reduction.<br/><br/>As
                <span class = "cr-hl cr-hl-dmg">${effectiveMaxHit}</span> is less than your auto-eat threshold of 
                <span class = "cr-hl cr-hl-health">${autoEatThreshold}</span>,
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> shouldn't be able to kill you.<br/><br/>` +
                afflictionMessage +
                `${this.showCalculations ? maxHitReason.equation : ''}`;
            }
            
            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
        }
    }

    setTargetArea(e, areaId, areaType) {
        e.preventDefault(); 
        e.stopPropagation();

        this._log(`WillIDie: Setting new target area`);

        let areaData = null;

        if(areaType === 'dungeon') {
            areaData = game.dungeonDisplayOrder.find(d => d.id === areaId);
        } else if(areaType === 'slayer') {
            areaData = game.slayerAreaDisplayOrder.find(d => d.id === areaId);
        } else {
            areaData = game.combatAreaDisplayOrder.find(d => d.id === areaId);
        }

        this._log(areaData);

        if(!this.skipRequirements && areaData instanceof Dungeon && areaData.unlockRequirement !== undefined && !game.checkRequirements(areaData.unlockRequirement)) {
            this._log("WillIDie: Cancelled area target setting - NOT UNLOCKED");
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
                this._log("WillIDie: Cancelled area target setting - FAILED REQUIREMENTS");
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

        if(game.combat.fightInProgress || game.combat.isActive) {
            this._log(`WillIDie: Fight in progress, not changing areas`);
            Toastify({
                text: `Will I Die?: Cannot change target area while in combat`,
                duration: 1500,
                gravity: 'top',
                position: 'center',
                backgroundColor: '#e56767',
                stopOnFocus: false
            }).showToast();
            return;
        }

        const unset = this._handleTButton(e, "AREA");

        if(unset)
            return;

        this.targetArea = areaData;
        this.recalculateSurvivability("Target area changed", "AREA", areaData);
    }
    
    setTargetMonster(e, areaId, monsterId, areaType) {
        e.preventDefault(); 
        e.stopPropagation();

        this._log(`WillIDie: Setting new target monster`);

        let areaData = null;

        if(areaType === 'slayer') {
            areaData = game.slayerAreaDisplayOrder.find(d => d.id === areaId);

            if(areaData instanceof SlayerArea) {
                const slayerLevelReq = areaData.slayerLevelRequired;
    
                if (!this.skipRequirements && !game.checkRequirements(areaData.entryRequirements, false, slayerLevelReq)) {
                    this._log("WillIDie: Cancelled area target setting - FAILED REQUIREMENTS");
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
        } else {
            areaData = game.combatAreaDisplayOrder.find(d => d.id === areaId);
        }

        this._log(areaData);
        this._log(monsterId)

        if(game.combat.fightInProgress || game.combat.isActive) {
            this._log(`WillIDie: Fight in progress, not changing monsters`);
            Toastify({
                text: `Will I Die?: Cannot change target monster while in combat`,
                duration: 1500,
                gravity: 'top',
                position: 'center',
                backgroundColor: '#e56767',
                stopOnFocus: false
            }).showToast();
            return;
        }

        const unset = this._handleTButton(e, "MONSTER");

        if(unset)
            return;

        this.recalculateSurvivability("Target area changed", "MONSTER", monsterId, areaData);
    }

    setTargetSlayerTask(e, selectedTier) {
        e.preventDefault(); 
        e.stopPropagation();

        this._log(`WillIDie: Setting new target slayer task`);

        if(game.combat.fightInProgress || game.combat.isActive) {
            this._log(`WillIDie: Fight in progress, not changing slayer task`);
            Toastify({
                text: `Will I Die?: Cannot change target slayer task while in combat`,
                duration: 1500,
                gravity: 'top',
                position: 'center',
                backgroundColor: '#e56767',
                stopOnFocus: false
            }).showToast();
            return;
        }

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

        const unset = this._handleTButton(e, "SLAYER");

        if(unset) {
            this.slayerTaskTierSelected = null;
            return;
        }
        
        this.slayerTaskTierSelected = selectedTier;

        this.recalculateSurvivability("Target slayer task changed", "SLAYER", monsters);
    }

    recalculateSurvivability(reason = "", areaOrMonster, target) {

        if(game.combat.fightInProgress || game.combat.isActive) {
            this._log(`WillIDie: Fight in progress, not calculating survivability`);
            this.pendingRecalculation = true;
            this._reRender();
            return;
        }

        this.currentSurvivabilityState = null;

        if(areaOrMonster === "NONE") {
            this._log(`WillIDie: Target removed, not calculating survivability`);
            this._reRender();
            return;
        }

        const areas = [...game.combatAreaDisplayOrder, ...game.slayerAreaDisplayOrder, ...game.dungeonDisplayOrder];

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
        } else {
            if(this.targetArea && !this.targetMonster && !this.targetSlayerTask) {
                this._log(`WillIDie: Found unambiguous area target for cold function call, recalculating survivability`);
                widMonsters = this.targetArea.monsters.map(m => new WIDMonster(m.id, this.targetArea, this.safetyFactor, this.afflictionFactor));
                areaOrMonster = "AREA";
                target = this.targetArea;
            } else if(this.targetMonster && !this.targetArea && !this.targetSlayerTask) {
                this._log(`WillIDie: Found unambiguous monster target for cold function call, recalculating survivability`);
                const areaForMonster = areas.find(a => a.monsters.find(m => m.id === this.targetMonster))
                widMonsters = [new WIDMonster(this.targetMonster, areaForMonster, this.safetyFactor, this.afflictionFactor)];
                areaOrMonster = "MONSTER";
                target = this.targetMonster;
            } else if(this.targetSlayerTask && !this.targetArea && !this.targetMonster) {
                this._log(`WillIDie: Found unambiguous slayer target for cold function call, recalculating survivability`);
                const areaForMonster = areas.find(a => a.monsters.find(m => m.id === this.targetSlayerTask[0].id))
                widMonsters = this.targetSlayerTask.map(m => new WIDMonster(m.id, areaForMonster, this.safetyFactor, this.afflictionFactor));
                areaOrMonster = "SLAYER";
                target = this.targetSlayerTask;
            } else {
                this._log(`WillIDie: Could not resolve cold function call, not recalculating survivability`);
                this._reRender();
                return;
            }
        }

        this.selectedMonsterTab = 0;

        this._log(`WillIDie: Recalculating survivability (${reason})`);

        this.targetType = areaOrMonster;

        if(this.targetType === "SLAYER" && this.integrateSemiAutoSlayer && mod.api.SEMIAutoSlayer !== undefined) {
            this._log(`WillIDie: SEMI Auto Slayer integration is enabled and possible, filtering out monsters that are blocked in the SEMI Auto Slayer task list`);
            const blockedBySemi = mod.api.SEMIAutoSlayer.getMonsterStates();
            widMonsters = widMonsters.filter(m => blockedBySemi[m.monsterId] === undefined || blockedBySemi[m.monsterId] !== 1);
        }

        if(widMonsters.length === 0) {
            this._log(`WillIDie: No monsters left after filtering, not recalculating survivability`);
            this.currentSurvivabilityState = null;
            this.survivabilityStateError = 1;
            this._reRender();
            return;
        }

        this.survivabilityStateError = 0;


        widMonsters.sort((a, b) => b.effectiveMaxHit - a.effectiveMaxHit);
        const mostDangerousMonster = widMonsters[0];

        const area = areas.find(a => a.monsters.find(m => m.id === mostDangerousMonster.monsterId));

        if(this._debug) {
            this._debugValues.monsters = widMonsters;
            this._debugValues.mostDangerousMonster = mostDangerousMonster;
            this._debugValues.player.damageReduction = mostDangerousMonster._playerDamageReduction;
        }

        this._updateSurvivabilityState(mostDangerousMonster, area, widMonsters, areaOrMonster);
        this.pendingRecalculation = false;
        this._reRender();
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

    _handleTButton(e) {
        if(e.target.classList.contains('cr-active')) {
            this.targetMonster = null;
            this.targetArea = null;
            this.targetSlayerTask = null;
            this.recalculateSurvivability("Target set to null", "NONE", null);
            e.target.classList.remove('cr-active');
            return true;
        }

        const areaTElements = document.querySelectorAll('.combat-resolver-set-area-target');
        const monsterTElements = document.querySelectorAll('.combat-resolver-set-monster-target');
        const slayerTaskTElements = document.querySelectorAll('.combat-resolver-set-slayer-task-target');
        const TElements = [...areaTElements, ...monsterTElements, ...slayerTaskTElements];

        TElements.forEach((e) => {
            e.classList.remove('cr-active');
        })
        
        e.target.classList.add('cr-active');

        return false;
    }

    handleMonsterTabClick(e) {
        const index = parseInt(e.target.dataset.index);

        if(!Number.isInteger(index))
            return;
        
        if(!this.currentSurvivabilityState)
            return;

        const mostDangerousMonster = this.currentSurvivabilityState.uniqueMonsters[index];
        
        if(this._debug)
            this._debugValues.mostDangerousMonster = mostDangerousMonster;

        this._updateSurvivabilityState(mostDangerousMonster);

        this.selectedMonsterTab = index;
        this._reRender();
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
            playerSelfHit: monster.effectiveDamageTakenPerAttack
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
}