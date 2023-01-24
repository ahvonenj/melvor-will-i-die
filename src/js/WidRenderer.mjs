export class WidRenderer {
    combatResolver = null;
    
    headerDropdown = null;
    headerDropdownEventCatcher = null;
    headerDropdownTimeout = null;

    tabComponent = null; 
    tabButton = null;
    tabContent = null;
    safetyFactorElement = null;
    semiIntegrationElement = null;
    monsterTabContainer = null;
    equationPopup = null;

    selectedMonsterTab = 0;
    slayerTaskTierSelected = null;

    headerComponentCreated = false;

    statsPanelSafetyIndicatorTextCol = null;
    statsPanelSafetyIndicatorValueCol = null;
    statsPanelSafetyIndicatorValueColTippy = null;
    safetyIndicatorText = null;
    statsPanelSafetyIndicator = null;

    _ctx = null;
    _tabOpen = false;

    _monsterTabTippys = [];

    constructor(ctx, combatResolver) {
        this._ctx = ctx;
        this.combatResolver = combatResolver;
    }

    _createHeaderComponent() {
        if(this.headerComponentCreated) return;

        this.combatResolver._log(`Will I Die?: Creating header component`);

        // We want to append our own header tab after equipment tab in the header
        const targetTab = document.querySelector('#page-header-equipment-dropdown').parentElement;

        if(!targetTab) {
            console.error(`Will I Die?: COULD NOT CREATE HEADER COMPONENT`);
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

        tabButton.onclick = (e) => {
            if(this.combatResolver && this.combatResolver.stickySafetyPanel) {
                e.stopPropagation();
                return;
            }
  
            this._tabOpen = true;
        }

        this.tabButton = tabButton;

        this.tabComponent.appendChild(this.tabButton);

        // Dropdown for when the tab is clicked
        this.headerDropdown = createElement('div', {
            id: "will-i-die-header-tab-dropdown",
            classList: ["dropdown-menu", "dropdown-menu-lg", "dropdown-menu-right", "p-0", "border-0", "font-size-sm"]
        });

        this.headerDropdownEventCatcher = createElement('div', {
            id: "will-i-die-header-tab-dropdown-event-catcher"
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
            text: `Safety Factor: ${this.combatResolver.safetyFactor}x`
        });

        this.semiIntegrationElement = createElement('div', {
            classList: ["wid-semi-integrated"],
            text: this.combatResolver.integrateSemiAutoSlayer ? "Integrated with SEMI" : ""
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
            this.combatResolver._printDebugValues();
        }

        header_right.appendChild(this.safetyFactorElement)
        header_right.appendChild(this.semiIntegrationElement)

        header.appendChild(header_left);
        header.appendChild(header_right);

        this.headerDropdown.appendChild(createElement('div', {
            classList: ["p-2", "text-center"]
        }).appendChild(header));

        this.tabContent = createElement('div', {
            classList: ["block-content", "block-content-full", "pt-0", "combat-resolver-tab-content"]
        });

        this.tabContent.onmouseover = (e) => {
            if(!this.combatResolver.currentSurvivabilityState)
                return;

            if(e.target.classList.contains('cr-eq-var')) {
                const equationId = Array.from(e.target.classList).find(c => c.indexOf('cr-eq-var') > -1 && c.length > 9);
                
                const vars = this.combatResolver.currentSurvivabilityState.maxHitReason.vars[equationId];
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
        //this.headerDropdown.appendChild(this.headerDropdownEventCatcher);
        this.headerDropdown.appendChild(this.monsterTabContainer);
        this.headerDropdown.appendChild(this.tabContent);
        this.tabComponent.appendChild(this.headerDropdown);
        targetTab.after(this.tabComponent);

        this.headerComponentCreated = true;

        this._reRender();
    }

    _createTaskPanelTButton() {
        const self = this;
        const slayerTaskPanelAppendTarget = document.querySelector('#combat-slayer-task-menu > div > div')
    
        const resolverTargetFromTaskButton = createElement('div', {
            id: 'combat-resolver-set-monster-target-from-task',
            text: "T"
        });

        resolverTargetFromTaskButton.onclick = (e) => {
            const taskMonster = game.combat.slayerTask.monster;
            
            if(taskMonster) {
                const areas = [...game.combatAreaDisplayOrder, ...game.slayerAreaDisplayOrder, ...game.dungeonDisplayOrder];
                const area = areas.find(a => a.monsters.find(m => m.id === taskMonster.id));

                self.combatResolver.setTargetMonster(
                    e, 
                    area.id,
                    taskMonster.id,
                    area instanceof Dungeon ? 'dungeon' : area instanceof SlayerArea ? 'slayer' : '');
            }
        }

        slayerTaskPanelAppendTarget.appendChild(resolverTargetFromTaskButton);
    }

    _removeTaskPanelTButton() {
        const btn = document.querySelector('#combat-resolver-set-monster-target-from-task');

        if(btn) {
            btn.onclick = null;
            btn.remove();
            return true;
        }

        return false;
    }

    _createStatsPanelSafetyIndicator() {
        const proxyTarget = document.querySelector('#combat-player-active-prayers');

        if(proxyTarget) {
            const target = proxyTarget.parentElement.parentElement;

            this.statsPanelSafetyIndicatorTextCol = createElement('div', {
                classList: ['col-8']
            });

            this.statsPanelSafetyIndicatorValueCol = createElement('div', {
                classList: ['col-4']
            });

            this.statsPanelSafetyIndicatorText = createElement('div', {
                classList: ['font-w400', 'font-size-sm', 'm-1'],
                text: 'Will I Die?'
            });
            
            this.statsPanelSafetyIndicatorValue = createElement('div', {
                classList: ['font-w600', 'font-size-sm', 'text-right', 'm-1'],
                text: '?'
            });

            this.statsPanelSafetyIndicatorText.style.lineHeight = '1.25';
            this.statsPanelSafetyIndicatorValue.style.cssText = `
                line-height: 1.25;
                float: right;
            `;

            this.statsPanelSafetyIndicatorTextCol.appendChild(this.statsPanelSafetyIndicatorText);
            this.statsPanelSafetyIndicatorValueCol.appendChild(this.statsPanelSafetyIndicatorValue);

            this.statsPanelSafetyIndicatorValueColTippy = tippy(this.statsPanelSafetyIndicatorValueCol, {
                content: "",
                allowHTML: true,
                placement: 'right',
                interactive: false,
                animation: false,
                onShow(instance) {
                    if(instance.popper.textContent.length === 0)
                        return false;
                }
            });

            target.appendChild(this.statsPanelSafetyIndicatorTextCol);
            target.appendChild(this.statsPanelSafetyIndicatorValueCol);

            this._reRender();
        }
    }

    _removeStatsPanelSafetyIndicator() {
        if(this.statsPanelSafetyIndicatorTextCol && this.statsPanelSafetyIndicatorValueCol) {
            this.statsPanelSafetyIndicatorTextCol.remove();
            this.statsPanelSafetyIndicatorValueCol.remove();

            if(this.statsPanelSafetyIndicatorValueColTippy) {
                this.statsPanelSafetyIndicatorValueColTippy.destroy();
                this.statsPanelSafetyIndicatorValueColTippy = null;
            }

            return true;
        }

        return false;
    }

    _fastResetTabContents() {
        if(!this._tabOpen) return;
        if(!this.combatResolver.currentSurvivabilityState) return;

        const mostDangerousMonster = this.combatResolver.currentSurvivabilityState.uniqueMonsters[0];

        if(!mostDangerousMonster) return;

        this.combatResolver._updateSurvivabilityState(mostDangerousMonster);

        this._tabOpen = false;
        this.selectedMonsterTab = 0;
        this._reRender();
    }

    _reRenderSafetyFactor() {
        this.safetyFactorElement.innerHTML = `Safety Factor: ${this.combatResolver.safetyFactor}x`;

        this.safetyFactorElement.classList.remove('wid-safety-factor-warning');
        this.safetyFactorElement.classList.remove('wid-safety-factor-danger');

        if(this.combatResolver.safetyFactor < 1.05) {
            this.safetyFactorElement.classList.add('wid-safety-factor-danger');
        } else if(this.combatResolver.safetyFactor < 1.07) {
            this.safetyFactorElement.classList.add('wid-safety-factor-warning');
        }
    }

    _reRenderIntegration() {
        if(!this.combatResolver.integrateSemiAutoSlayer) {
            this.semiIntegrationElement.classList.add('wid-semi-integration-disabled');
        } else {
            this.semiIntegrationElement.classList.remove('wid-semi-integration-disabled');
        }
    }

    _reRenderMonsterTabs() {
        if(!this.combatResolver.currentSurvivabilityState) {
            this.monsterTabContainer.classList.add('wid-monster-tabs-invisible');
            return;
        }

        this._monsterTabTippys.forEach(t => t.destroy());

        this.monsterTabContainer.classList.remove('wid-monster-tabs-invisible');
        
        const buttons = [];

        let i = 1;

        for(const widMonster of this.combatResolver.currentSurvivabilityState.uniqueMonsters) {
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

    _reRenderIndicators(survivabilityStateOk = false) {
        const self = this;
        const survivabilityState = this.combatResolver.currentSurvivabilityState;
        const survivabilityStateError = this.combatResolver.survivabilityStateError;
        const pendingRecalculation = this.combatResolver.pendingRecalculation;

        const indicators = [
            {
                indicator: this.tabButton, 
                recalcClass: 'combat-resolver-recalc'
            },
            {
                indicator: this.statsPanelSafetyIndicatorValue, 
                recalcClass: 'combat-resolver-recalc-text'
            }
        ].filter(indicator => (indicator.indicator !== undefined && indicator.indicator !== null));

        const classes = ['combat-resolver-safe', 'combat-resolver-danger', 'combat-resolver-unknown', 'combat-resolver-recalc', 'combat-resolver-recalc-text'];

        function removeIndicatorClasses() {
            indicators.forEach(obj => {
                classes.forEach(indClass => {
                    obj.indicator.classList.remove(indClass);
                })
            });
        }

        removeIndicatorClasses();

        if(survivabilityStateError === 1 || !survivabilityState) {
            indicators.forEach(obj => {
                obj.indicator.textContent = '?';
                obj.indicator.classList.add('combat-resolver-unknown')
            });
            return;
        }

        if(survivabilityState.canDie || survivabilityState.playerCanKillSelf) {
            indicators.forEach(obj => {
                obj.indicator.textContent = 'DANGER';
                obj.indicator.classList.add('combat-resolver-danger')
            });
        } else {
            indicators.forEach(obj => {
                obj.indicator.textContent = 'SAFE';
                obj.indicator.classList.add('combat-resolver-safe')
            });
        }

        if(pendingRecalculation) {
            removeIndicatorClasses();
            indicators.forEach(obj => obj.indicator.classList.add(obj.recalcClass));
        }

        if(survivabilityStateOk) {
            const { effectiveMaxHit } = this.combatResolver.currentSurvivabilityState;
            this.statsPanelSafetyIndicatorValueColTippy.setContent(`Max hit: ${effectiveMaxHit}`);
        }
    }

    // Rerenders all the DOM elements related to this mod with new values
    _reRender() {
        if(!this.headerComponentCreated) return;

        this.combatResolver._log(`Will I Die?: Rerendering`);

        this._reRenderIndicators(
            this.combatResolver.survivabilityStateError === 0 &&
            this.combatResolver.currentSurvivabilityState
        );

        if(this.combatResolver.survivabilityStateError === 1) {
            this.tabContent.innerHTML = `Will I Die? is currently unable to calculate your survivability.<br/><br/>
            This is likely due to trying to target a slayer tier with SEMI Auto Slayer integration enabled,
            but your current task block list is filtering out all tasks in that tier.<br/><br/>`;

            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
            return;
        }

        // No area target selected or some other issue - can't tell if safe or not so we render ?
        if(!this.combatResolver.currentSurvivabilityState) {
            this.tabContent.innerHTML = `Got to the Combat Area Selection page to first set a combat area target for Will I Die?<br/><br/>
            After you have set the combat area target, Will I Die? will begin to calculate whether you will live or die 
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
        } = this.combatResolver.currentSurvivabilityState;
        
        const numberOrderStrings = ['', 'second ', 'third ', 'fourth ', 'fifth ', 'sixth ', 'seventh ', 'eighth ', 'ninth ', 'tenth '];

        const afflictionMessage = maxHitReason.affliction.canAfflict ? `WARNING - 
                <span class = "cr-hl cr-hl-enemy">${maxHitReason.monsterName}</span> is able to cast 
                <span class = "cr-hl cr-hl-spec">AFFLICTION</span>, reducing your auto eat treshold from 
                <span class = "cr-hl cr-hl-health">${normalAutoEatThreshold}</span> to 
                <span class = "cr-hl cr-hl-dmg">${autoEatThreshold}</span><br/><br/>` : "";

        if(canDie || playerCanKillSelf) {
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
                `${this.combatResolver.showCalculations ? maxHitReason.equation : ''}`;
            }
            
            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
        }
        else {
            if(this.combatResolver.pendingRecalculation) {
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
                `${this.combatResolver.showCalculations ? maxHitReason.equation : ''}`;
            }
            
            this._reRenderMonsterTabs();
            this._reRenderSafetyFactor();
            this._reRenderIntegration();
        }
    }

    _handleTButton(e) {
        if(e.target.classList.contains('cr-active')) {
            this.combatResolver.targetMonster = null;
            this.combatResolver.targetArea = null;
            this.combatResolver.targetSlayerTask = null;
            this.combatResolver.recalculateSurvivability("Target set to null", "NONE", null);
            e.target.classList.remove('cr-active');
            return true;
        }

        const areaTElements = document.querySelectorAll('.combat-resolver-set-area-target');
        const monsterTElements = document.querySelectorAll('.combat-resolver-set-monster-target');
        const slayerTaskTElements = document.querySelectorAll('.combat-resolver-set-slayer-task-target');
        const slayerTaskPanelTButton = document.querySelector('#combat-resolver-set-monster-target-from-task');
        const TElements = [...areaTElements, ...monsterTElements, ...slayerTaskTElements];

        TElements.forEach((e) => {
            e.classList.remove('cr-active');
        })

        if(slayerTaskPanelTButton)
            slayerTaskPanelTButton.classList.remove('cr-active');
        
        e.target.classList.add('cr-active');

        return false;
    }

    handleMonsterTabClick(e) {
        const index = parseInt(e.target.dataset.index);

        if(!Number.isInteger(index))
            return;
        
        if(!this.combatResolver.currentSurvivabilityState)
            return;

        const mostDangerousMonster = this.combatResolver.currentSurvivabilityState.uniqueMonsters[index];
        
        if(this._debug)
            this.combatResolver._debugValues.mostDangerousMonster = mostDangerousMonster;

        this.combatResolver._updateSurvivabilityState(mostDangerousMonster);

        this.selectedMonsterTab = index;
        this._reRender();
    }

    _enableStickySafetyPanel() {
        const self = this;

        this.headerDropdown.style.cssText = `
            position: fixed !important;
            display: block !important;
            border: solid 1px #fff!important;
            right: 10px !important;
            top: 50px !important;
            left: unset !important;
            transform: none !important;
            max-width: 300px;
            opacity: 0.9;
            transition: opacity 0.1s;
        `;
         
        /*this.headerDropdown.onmouseenter = () => {
            clearTimeout(self.headerDropdownTimeout);
            self.headerDropdown.style.opacity = 0;
            self.headerDropdownTimeout = setTimeout(() => {
                self.headerDropdown.style.display = "none";
            }, 100);
        }

        this.headerDropdown.onmouseleave = () => {
            clearTimeout(self.headerDropdownTimeout);
            this.headerDropdown.style.display = "block";
            this.headerDropdown.style.opacity = 0.9;
        }*/
    }

    _disableStickySafetyPanel() {
        this.headerDropdown.style.cssText = "";
    }
}